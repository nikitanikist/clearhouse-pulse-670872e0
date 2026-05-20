/**
 * scripts/seed-demo-users.ts
 * -----------------------------------------------------------------------------
 * Creates the 5 demo accounts for the Clearhouse portal (one per security
 * level). Each account is email-confirmed so you can log in immediately.
 *
 * Run AFTER you have:
 *   1) Created your Supabase project
 *   2) Run db/migrations/01_schema.sql in the SQL editor
 *   3) Run db/migrations/02_seed.sql in the SQL editor
 *
 * Required environment variables (do NOT commit these):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings → API → service_role)
 *
 * Usage (from the project root):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/seed-demo-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "clearhouse2026";

const demoUsers = [
  { email: "sarb@clearhouse.ca",          full_name: "Sarb Clearhouse",  security_level: 1 },
  { email: "david.chen@clearhouse.ca",    full_name: "David Chen",       security_level: 2 },
  { email: "priya.sharma@clearhouse.ca",  full_name: "Priya Sharma",     security_level: 3 },
  { email: "emily.tremblay@clearhouse.ca",full_name: "Emily Tremblay",   security_level: 4 },
  { email: "anita.desai@clearhouse.ca",   full_name: "Anita Desai",      security_level: 5 },
] as const;

async function main() {
  for (const u of demoUsers) {
    console.log(`→ ${u.email} (L${u.security_level})`);

    // Try to create the user. If they already exist, look them up and update.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, security_level: u.security_level },
    });

    let userId: string | undefined = created?.user?.id;

    if (createErr) {
      if (!/already (registered|exists)/i.test(createErr.message)) {
        console.error(`  create failed: ${createErr.message}`);
        continue;
      }
      // Look up existing user
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) {
        console.error(`  listUsers failed: ${listErr.message}`);
        continue;
      }
      const existing = list.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
      if (!existing) {
        console.error(`  could not locate existing user ${u.email}`);
        continue;
      }
      userId = existing.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, security_level: u.security_level },
      });
      if (updErr) console.error(`  update failed: ${updErr.message}`);
    }

    if (!userId) continue;

    // Upsert profile (in case the trigger didn't fire or values drifted).
    const { error: profErr } = await admin
      .from("profiles")
      .upsert(
        { user_id: userId, full_name: u.full_name, security_level: u.security_level },
        { onConflict: "user_id" }
      );
    if (profErr) console.error(`  profile upsert failed: ${profErr.message}`);
    else console.log(`  ✓ ready`);
  }

  console.log("\nDone. Sign in with password:", PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
