// Blynk App-View API — returns config for native WebView wrappers (iOS/Android).
// Requires header `X-View-Secret: <api_key.secret>` (the same secret stored hashed
// in api_keys.secret_key_hash). Public key in `X-API-Key`.
//
// GET /v1/view/config            -> { url, theme, branding, version, features }
// GET /v1/view/manifest          -> JSON manifest the native app loads at boot
// GET /v1/view/health            -> liveness check

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key, x-view-secret",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://blynks.lovable.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/app-view-api/, "")
    .replace(/^\/app-view-api/, "") || "/";

  // Health is public so the native shell can verify connectivity without keys
  if (path === "/v1/view/health") {
    return json({ status: "ok", service: "blynk-app-view", time: new Date().toISOString() });
  }

  const publicKey = req.headers.get("x-api-key");
  const secret = req.headers.get("x-view-secret");
  if (!publicKey) return json({ error: "Missing X-API-Key header" }, 401);
  if (!secret) return json({ error: "Missing X-View-Secret header" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: key } = await admin
    .from("api_keys")
    .select("id, secret_key_hash, scopes, is_active, expires_at")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (!key || !key.is_active) return json({ error: "Invalid API key" }, 401);
  if (key.expires_at && new Date(key.expires_at) < new Date()) return json({ error: "Key expired" }, 401);

  const hash = await sha256(secret);
  if (hash !== key.secret_key_hash) return json({ error: "Invalid view secret" }, 401);

  // Optional scope enforcement: require "app:view" — but accept legacy keys with no scopes
  if (Array.isArray(key.scopes) && key.scopes.length > 0 && !key.scopes.includes("app:view")) {
    return json({ error: "Key missing scope app:view" }, 403);
  }

  if (path === "/v1/view/config" || path === "/v1/view/manifest" || path === "/") {
    return json({
      app: {
        name: "Blynk",
        bundle_id: "app.lovable.blynk",
        version: "1.0.0",
        platform: "webview",
      },
      url: PUBLIC_SITE_URL,
      entrypoint: `${PUBLIC_SITE_URL}/feed`,
      theme: {
        primary: "#3B82F6",
        background: "#0F172A",
        statusbar: "light",
        navbar: "#0F172A",
      },
      branding: {
        logo: `${PUBLIC_SITE_URL}/logo-192.png`,
        splash: `${PUBLIC_SITE_URL}/logo-192.png`,
      },
      features: {
        push: true,
        camera: true,
        geolocation: true,
        webrtc: true,
        share: true,
        downloads: true,
      },
      headers: {
        // Native shell should forward these into the WebView so the site
        // can detect it's running inside the app
        "X-Blynk-App": "1",
      },
      cache: { strategy: "network-first", ttl_seconds: 300 },
      fetched_at: new Date().toISOString(),
    });
  }

  return json({ error: "Not found", hint: "Use GET /v1/view/config" }, 404);
});