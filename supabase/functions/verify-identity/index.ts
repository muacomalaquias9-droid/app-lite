import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "config", message: "Serviço de verificação indisponível." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized", message: "Sessão inválida." }, 401);

    const { selfie, document, selfiePath, documentPath } = await req.json();
    if (!selfie || !document) {
      return json({ error: "invalid", message: "Envia a foto do rosto e do documento." }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Hoje é ${today}. Analisa as duas imagens: a primeira é uma selfie ao vivo, a segunda é um documento de identidade (bilhete de identidade, cartão ou passaporte).

Devolve APENAS JSON válido com este formato exato:
{
  "same_person": boolean,
  "face_match_score": number,          // 0 a 100
  "document_is_valid_type": boolean,   // é realmente um documento de identidade oficial
  "document_looks_fake": boolean,      // sinais de fraude, edição digital, foto de ecrã, impressão
  "selfie_is_live_person": boolean,    // rosto humano real, não foto de foto, ecrã, máscara ou imagem gerada
  "birth_date": "YYYY-MM-DD" | null,
  "expiry_date": "YYYY-MM-DD" | null,
  "document_expired": boolean,
  "full_name": string | null,
  "document_number": string | null,
  "age": number | null,
  "reason": string                     // explicação curta em português
}

Regras: se não conseguires ler uma data, devolve null. Sê rigoroso na deteção de fraude.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: selfie } },
              { type: "image_url", image_url: { url: document } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      const message =
        aiRes.status === 429
          ? "Muitos pedidos. Tenta novamente em alguns segundos."
          : aiRes.status === 402
          ? "Créditos de IA esgotados. O dono da app precisa de adicionar créditos."
          : "Não foi possível analisar as imagens agora.";
      return json({ error: "ai", message }, aiRes.status);
    }

    const aiJson = await aiRes.json();
    let result: any = {};
    try {
      result = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      return json({ error: "ai", message: "Resposta inválida da análise. Tenta outra vez." }, 502);
    }

    // ---- Regras determinísticas ----
    const reasons: string[] = [];
    const birthDate: string | null = result.birth_date ?? null;
    const expiry: string | null = result.expiry_date ?? null;

    let age: number | null = typeof result.age === "number" ? result.age : null;
    if (birthDate) {
      const b = new Date(birthDate);
      if (!isNaN(b.getTime())) {
        const now = new Date();
        age = now.getFullYear() - b.getFullYear() -
          (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
      }
    }

    const expired = expiry ? new Date(expiry) < new Date() : !!result.document_expired;

    if (!result.document_is_valid_type) reasons.push("O documento enviado não parece ser um documento de identidade oficial.");
    if (result.document_looks_fake) reasons.push("O documento apresenta sinais de falsificação ou edição.");
    if (!result.selfie_is_live_person) reasons.push("A foto do rosto não parece ser de uma pessoa real ao vivo.");
    if (!result.same_person || (result.face_match_score ?? 0) < 75)
      reasons.push("O rosto da selfie não corresponde ao rosto do documento.");
    if (expired) reasons.push("O documento está expirado.");
    if (age === null) reasons.push("Não foi possível ler a data de nascimento no documento.");
    else if (age < 13) reasons.push("É necessário ter 13 anos ou mais para obter o selo.");

    const approved = reasons.length === 0;
    const reason = approved
      ? (result.reason || "Rosto e documento correspondem. Documento válido.")
      : reasons.join(" ");

    const admin = createClient(supabaseUrl, serviceKey);

    await admin.from("identity_verifications").insert({
      user_id: user.id,
      selfie_url: selfiePath ?? null,
      document_url: documentPath ?? null,
      birth_date: birthDate,
      document_expiry: expiry,
      document_number: result.document_number ?? null,
      full_name_document: result.full_name ?? null,
      face_match_score: result.face_match_score ?? null,
      ai_verdict: approved ? "approved" : "rejected",
      ai_reason: reason,
      status: approved ? "approved" : "rejected",
    });

    if (approved) {
      await admin.from("profiles").update({ verified: true, badge_type: "blue" }).eq("id", user.id);
      await admin.from("notifications").insert({
        user_id: user.id,
        type: "verification",
        title: "Selo de verificação aprovado",
        message: "A tua identidade foi confirmada. O selo azul já aparece no teu perfil.",
      });
    }

    return json({
      approved,
      reason,
      age,
      expiry_date: expiry,
      face_match_score: result.face_match_score ?? null,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "server", message: "Erro inesperado na verificação." }, 500);
  }
});
