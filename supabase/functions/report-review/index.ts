import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROTECTED_EMAIL = "isaacmuaco582@gmail.com";

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
    if (!apiKey) return json({ error: "config", message: "Serviço de análise indisponível." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const reporter = userData?.user;
    if (!reporter) return json({ error: "unauthorized", message: "Sessão inválida." }, 401);

    const body = await req.json().catch(() => ({}));
    const contentType = String(body.contentType || "post");
    const contentId = String(body.contentId || "");
    const category = String(body.category || "other").slice(0, 60);
    const details = String(body.details || "").slice(0, 1000);

    if (!contentId || !["post", "user", "comment"].includes(contentType)) {
      return json({ error: "invalid", message: "Denúncia inválida." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ---- Recolher o conteúdo denunciado (somente no backend) ----
    let offenderId = "";
    let material: string[] = [];

    if (contentType === "post") {
      const { data: post } = await admin
        .from("posts")
        .select("id, user_id, content")
        .eq("id", contentId)
        .maybeSingle();
      if (!post) return json({ error: "not_found", message: "Publicação não encontrada." }, 404);
      offenderId = post.user_id;
      material.push(`Publicação: ${post.content ?? ""}`);
    } else if (contentType === "comment") {
      const { data: comment } = await admin
        .from("comments")
        .select("id, user_id, content")
        .eq("id", contentId)
        .maybeSingle();
      if (!comment) return json({ error: "not_found", message: "Comentário não encontrado." }, 404);
      offenderId = comment.user_id;
      material.push(`Comentário: ${comment.content ?? ""}`);
    } else {
      offenderId = contentId;
    }

    // Histórico recente do utilizador denunciado
    const [{ data: recentPosts }, { data: recentComments }, { data: offenderProfile }] = await Promise.all([
      admin.from("posts").select("content").eq("user_id", offenderId).order("created_at", { ascending: false }).limit(15),
      admin.from("comments").select("content").eq("user_id", offenderId).order("created_at", { ascending: false }).limit(15),
      admin.from("profiles").select("id, email, username, full_name, bio").eq("id", offenderId).maybeSingle(),
    ]);

    (recentPosts || []).forEach((p: any) => p?.content && material.push(`Post: ${p.content}`));
    (recentComments || []).forEach((c: any) => c?.content && material.push(`Comentário: ${c.content}`));
    if (offenderProfile?.bio) material.push(`Bio: ${offenderProfile.bio}`);
    if (offenderProfile?.username) material.push(`Nome de utilizador: ${offenderProfile.username}`);

    // Registar sempre a denúncia
    await admin.from("reports").insert({
      reporter_id: reporter.id,
      reported_content_id: contentId,
      content_type: contentType,
      reason: `${category}${details ? `: ${details}` : ""}`,
      status: "pending",
    });

    // Conta protegida nunca é bloqueada
    if (offenderProfile?.email === PROTECTED_EMAIL || offenderId === reporter.id) {
      return json({ received: true, blocked: false, reason: "Denúncia registada." });
    }

    const prompt = `Analisa esta denúncia numa rede social em português (Angola).

Categoria da denúncia: ${category}
Detalhes do denunciante: ${details || "(sem detalhes)"}

Conteúdo publicado pela conta denunciada:
${material.slice(0, 40).map((m, i) => `${i + 1}. ${m}`).join("\n") || "(sem conteúdo textual)"}

Decide se a conta viola gravemente as regras: burla/fraude/golpe financeiro, phishing ou roubo de contas, falta de respeito grave (insultos, assédio, ameaças, discurso de ódio), conteúdo sexual com menores, ou personificação enganosa.

Devolve APENAS JSON válido:
{
  "violation": boolean,
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "categories": string[],
  "should_block_account": boolean,
  "reason": string
}

Sê rigoroso com burlas e insultos, mas não bloqueies por crítica, humor inofensivo ou desacordo.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      const message =
        aiRes.status === 429
          ? "Muitas análises em curso. A denúncia foi registada e será revista."
          : aiRes.status === 402
          ? "Créditos de IA esgotados. A denúncia foi registada."
          : "A denúncia foi registada, mas a análise automática falhou.";
      return json({ received: true, blocked: false, message }, 200);
    }

    const aiJson = await aiRes.json();
    let verdict: any = {};
    try {
      verdict = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      return json({ received: true, blocked: false, message: "Denúncia registada." });
    }

    const severity = String(verdict.severity || "none");
    const shouldBlock =
      !!verdict.violation && (verdict.should_block_account === true || severity === "high" || severity === "critical");

    if (shouldBlock) {
      await admin.from("blocked_accounts").upsert(
        {
          user_id: offenderId,
          blocked_by: null,
          reason: String(verdict.reason || "Violação das diretrizes da comunidade").slice(0, 500),
        },
        { onConflict: "user_id" },
      );
      await admin.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("reported_content_id", contentId).eq("reporter_id", reporter.id);
      await admin.from("notifications").insert({
        user_id: offenderId,
        type: "moderation",
        title: "Conta bloqueada",
        message: "A tua conta foi bloqueada por violar as diretrizes. Podes pedir revisão.",
      });
    }

    return json({ received: true, blocked: shouldBlock, severity });
  } catch (e) {
    console.error(e);
    return json({ error: "server", message: "Erro ao processar a denúncia." }, 500);
  }
});
