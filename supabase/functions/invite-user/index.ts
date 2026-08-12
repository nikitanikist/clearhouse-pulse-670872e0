// invite-user: Level-1 admins invite a new portal login user via Supabase invite email.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

  const { data: profile, error: profileErr } = await caller
    .from("profiles")
    .select("security_level")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileErr) return json({ error: profileErr.message }, 400);
  if (!profile || profile.security_level !== 1) return json({ error: "Admins only" }, 403);

  let body: { email?: string; full_name?: string; security_level?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = (body.email ?? "").trim();
  const full_name = (body.full_name ?? "").trim();
  const security_level = Number(body.security_level);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email is required" }, 400);
  if (full_name.length < 1 || full_name.length > 255) return json({ error: "Full name is required" }, 400);
  if (!Number.isInteger(security_level) || security_level < 1 || security_level > 5) {
    return json({ error: "Security level must be between 1 and 5" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, security_level },
  });

  if (inviteErr) return json({ error: inviteErr.message }, 400);

  return json({ success: true });
});
