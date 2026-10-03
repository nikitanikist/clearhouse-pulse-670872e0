// admin-manage-user: Level-1 admins create / update / delete portal login users directly.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type Action = "create" | "update" | "delete";

interface Body {
  action?: Action;
  user_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  security_level?: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  if (action !== "create" && action !== "update" && action !== "delete") {
    return json({ error: "action must be create, update, or delete" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (action === "create") {
    const email = (body.email ?? "").trim();
    const password = (body.password ?? "").trim();
    const full_name = (body.full_name ?? "").trim();
    const security_level = Number(body.security_level);

    if (!isValidEmail(email)) return json({ error: "A valid email is required" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (full_name.length < 1 || full_name.length > 255) return json({ error: "Full name is required" }, 400);
    if (!Number.isInteger(security_level) || security_level < 1 || security_level > 6) {
      return json({ error: "Security level must be between 1 and 6" }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, security_level },
    });

    if (error) return json({ error: error.message }, 400);
    return json({ success: true, user_id: data.user?.id });
  }

  if (action === "update") {
    const user_id = (body.user_id ?? "").trim();
    const email = (body.email ?? "").trim();
    const full_name = (body.full_name ?? "").trim();
    const security_level = Number(body.security_level);

    if (!user_id) return json({ error: "user_id is required" }, 400);
    if (!isValidEmail(email)) return json({ error: "A valid email is required" }, 400);
    if (full_name.length < 1 || full_name.length > 255) return json({ error: "Full name is required" }, 400);
    if (!Number.isInteger(security_level) || security_level < 1 || security_level > 6) {
      return json({ error: "Security level must be between 1 and 6" }, 400);
    }

    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      email,
      user_metadata: { full_name, security_level },
    });
    if (authErr) return json({ error: authErr.message }, 400);

    const { error: profErr } = await admin
      .from("profiles")
      .update({ full_name, email, security_level })
      .eq("user_id", user_id);
    if (profErr) return json({ error: profErr.message }, 400);

    return json({ success: true });
  }

  // action === "delete"
  const user_id = (body.user_id ?? "").trim();
  if (!user_id) return json({ error: "user_id is required" }, 400);
  if (user_id === userData.user.id) return json({ error: "You cannot delete your own account" }, 400);

  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return json({ error: error.message }, 400);
  return json({ success: true });
});
