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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!apiKey) return json({ error: "config", message: "Serviço de revisão indisponível." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized", message: "Sessão inválida." }, 401);

    const { email, password, selfie, document, selfiePath, documentPath } = await req.json().catch(() => ({}));

    if (!email || !password || !selfie || !document) {
      return json({ error: "invalid", message: "Envia email, senha, documento e foto do rosto." }, 400);
    }

    // 1) O email tem de ser o da própria conta bloqueada
    if (String(email).trim().toLowerCase() !== String(user.email || "").toLowerCase()) {
      return json({ approved: false, reason: "O email não corresponde à conta bloqueada." });
    }

    // 2) Confirmar a senha da conta (validação no backend)
    const checkClient = createClient(supabaseUrl, anon);
    const { error: pwError } = await checkClient.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    });
    if (pwError) {
      return json({ approved: false, reason: "A senha da conta está incorreta." });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("id, username, full_name, first_name")
      .eq("id", user.id)
      .maybeSingle();

    const accountName = profile?.full_name || profile?.first_name || profile?.username || "";
    const today = new Date().toISOString().slice(0, 10);

    // 3) IA compara rosto vs documento e valida o nome da conta
    const prompt = `Hoje é ${today}. A primeira imagem é uma selfie ao vivo. A segunda é um documento de identidade oficial (bilhete de identidade, cartão ou passaporte).

Nome registado na conta da rede social: "${accountName}".

Devolve APENAS JSON válido:
{
  "same_person": boolean,
  "face_match_score": number,
  "document_is_valid_type": boolean,
  "document_looks_fake": boolean,
  "selfie_is_live_person": boolean,
  "document_expired": boolean,
  "full_name": string | null,
  "name_matches_account": boolean,
  "birth_date": "YYYY-MM-DD" | null,
  "reason": string
}

Sê muito rigoroso: recusa fotos de ecrã, imagens editadas, documentos de outra pessoa e rostos diferentes.`;

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

    const reasons: string[] = [];
    if (!result.document_is_valid_type) reasons.push("O documento não parece ser um documento de identidade oficial.");
    if (result.document_looks_fake) reasons.push("O documento apresenta sinais de falsificação.");
    if (result.document_expired) reasons.push("O documento está expirado.");
    if (!result.selfie_is_live_person) reasons.push("A foto do rosto não parece ser de uma pessoa real ao vivo.");
    if (!result.same_person || (result.face_match_score ?? 0) < 75)
      reasons.push("O rosto da foto não corresponde ao rosto do documento.");
    if (result.name_matches_account === false)
      reasons.push("O nome do documento não corresponde ao nome da conta.");

    const approved = reasons.length === 0;
    const reason = approved
      ? "Identidade confirmada. A conta foi desbloqueada."
      : reasons.join(" ");

    await admin.from("identity_verifications").insert({
      user_id: user.id,
      selfie_url: selfiePath ?? null,
      document_url: documentPath ?? null,
      birth_date: result.birth_date ?? null,
      full_name_document: result.full_name ?? null,
      face_match_score: result.face_match_score ?? null,
      ai_verdict: approved ? "approved" : "rejected",
      ai_reason: `Revisão de conta bloqueada: ${reason}`,
      status: approved ? "approved" : "rejected",
    });

    if (approved) {
      await admin.from("blocked_accounts").delete().eq("user_id", user.id);
      await admin.from("notifications").insert({
        user_id: user.id,
        type: "moderation",
        title: "Conta desbloqueada",
        message: "A tua identidade foi confirmada e a conta voltou a ficar ativa.",
      });
    }

    return json({ approved, reason, face_match_score: result.face_match_score ?? null });
  } catch (e) {
    console.error(e);
    return json({ error: "server", message: "Erro inesperado na revisão." }, 500);
  }
});
