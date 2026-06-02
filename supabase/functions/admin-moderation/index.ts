import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROTECTED_EMAIL = "isaacmuaco582@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token invalid" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const adminUserId = claimsData.claims.sub;
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", adminUserId).eq("role", "admin").maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const action = String(body.action || "");
    const targetUserId = String(body.targetUserId || "");
    const postId = String(body.postId || "");
    const reason = String(body.reason || "Ação de moderação admin").slice(0, 500);

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const targetId = targetUserId || (postId ? undefined : "");
    if (targetId) {
      const { data: targetProfile } = await adminClient.from("profiles").select("email").eq("id", targetId).maybeSingle();
      if (targetProfile?.email === PROTECTED_EMAIL) {
        return new Response(JSON.stringify({ error: "Protected account" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "block-user") {
      if (!targetUserId) throw new Error("targetUserId required");
      const { error } = await adminClient.from("blocked_accounts").upsert({ user_id: targetUserId, blocked_by: adminUserId, reason }, { onConflict: "user_id" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "unblock-user") {
      if (!targetUserId) throw new Error("targetUserId required");
      const { error } = await adminClient.from("blocked_accounts").delete().eq("user_id", targetUserId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete-post") {
      if (!postId) throw new Error("postId required");
      const { error } = await adminClient.from("posts").delete().eq("id", postId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete-user-content") {
      if (!targetUserId) throw new Error("targetUserId required");
      await adminClient.from("posts").delete().eq("user_id", targetUserId);
      await adminClient.from("stories").delete().eq("user_id", targetUserId);
      await adminClient.from("verification_videos").delete().eq("user_id", targetUserId);
      await adminClient.from("comments").delete().eq("user_id", targetUserId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete-account") {
      if (!targetUserId) throw new Error("targetUserId required");
      // Hard delete — irreversible. Removes content from every surface (feed, search, profile, chat).
      const tables = [
        "post_likes", "post_reactions", "comments", "posts",
        "stories", "story_views", "story_reactions",
        "verification_videos",
        "messages", "conversations",
        "follows", "friend_requests",
        "notifications", "user_locations", "user_presence",
        "blocked_accounts", "user_suspensions", "user_roles",
        "profiles",
      ];
      for (const t of tables) {
        // best-effort: ignore missing columns/tables
        await adminClient.from(t).delete().or(`user_id.eq.${targetUserId},id.eq.${targetUserId},sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId},follower_id.eq.${targetUserId},following_id.eq.${targetUserId}`).then(() => null, () => null);
      }
      const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Admin moderation error:", error);
    return new Response(JSON.stringify({ error: error.message || "Moderation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});