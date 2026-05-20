# Supabase Setup — Clearhouse LLP Portal (BYO Supabase)

The app is wired for **your own Supabase project**, billed directly to Clearhouse LLP. Lovable Cloud is intentionally NOT used.

---

## 1. Create the Supabase project (one-time, 5 min)

1. Go to **https://supabase.com** and sign up / sign in with the Clearhouse-owned email.
2. **New project**:
   - Name: `clearhouse-hr`
   - Region: **Canada (Central)** (closest to your team)
   - Database password: pick a strong one and save it in your password manager
   - Plan: **Free** for now. Upgrade to **Pro ($25/mo)** before handover.
3. Wait ~2 min for provisioning.

## 2. Grab your project keys

In the new project's dashboard → **Project Settings → API**, copy:

- **Project URL** → looks like `https://xxxxxxxx.supabase.co`
- **anon public** key → starts with `eyJ...`
- **service_role secret** key → also `eyJ...` (KEEP PRIVATE — used only by the seed script on your laptop)

## 3. Connect Supabase to Lovable

In the Lovable editor, click the green **Supabase** button (top-right) → **Connect Supabase** → authorize → pick `clearhouse-hr`. Lovable will inject `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` automatically.

> **Fallback if the green button isn't available:** go to Workspace Settings → Build Secrets and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` manually with the values from step 2.

## 4. Run the schema migration

In your Supabase dashboard → **SQL Editor** → **New query** → paste the entire contents of `db/migrations/01_schema.sql` → **Run**.

You should see "Success. No rows returned" and new tables appear under **Database → Tables**.

## 5. Run the seed migration

SQL Editor → New query → paste `db/migrations/02_seed.sql` → **Run**.

This inserts 11 demo employees (10 originals + Karan Operations Lead for Level 5 visibility), 5 core-competency rows each, 3 dev-plan rows each, 9 interpersonal assessments each, and seed management notes.

## 6. Create the 5 demo auth users

On your local machine (you only need to do this once), in the project root:

```bash
SUPABASE_URL="https://xxxxxxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..." \
bun run scripts/seed-demo-users.ts
```

You'll see one ✓ per user. All accounts use password `clearhouse2026`. Rotate before handover.

| Email | Level | Sees |
|---|---|---|
| sarb@clearhouse.ca | 1 | All employees |
| david.chen@clearhouse.ca | 2 | Manager, Sr Associate, Intermediate, Associate |
| priya.sharma@clearhouse.ca | 3 | Sr Associate, Intermediate, Associate |
| emily.tremblay@clearhouse.ca | 4 | Intermediate, Associate |
| anita.desai@clearhouse.ca | 5 | Operations only (Karan) |

## 7. Test

Open the app, sign in as each demo user, confirm the visible employee list matches the table above. Per-employee data (Overview, Interpersonal, Growth, Notes) all come from the database.

## Upgrade to Pro at handover

When Clearhouse takes over: Supabase dashboard → **Project Settings → Billing** → upgrade to **Pro ($25/mo)**. Billing card stays on the Clearhouse-owned account.

## Future migrations

Add new SQL files as `db/migrations/03_*.sql`, `04_*.sql`, etc. Run them in the SQL editor in order.
