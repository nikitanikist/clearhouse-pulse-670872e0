-- Dynamic Permissions Matrix (Phase 8).
--
-- Replaces the semi-static access_rules model with a two-table design:
--   1. permission_resources   -- registry of everything that can be toggled
--      (tabs, sections, admin actions). Developers add new rows when they
--      ship new UI; admins never touch this table directly.
--   2. position_permissions   -- per (position, resource) toggles chosen by
--      admins in Settings. One row per combination.
--
-- NOTE: We DO NOT touch public.positions / public.departments / employees;
-- Bryon's live data is preserved. We only add two new tables and seed them.

-- 1. Resource registry -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permission_resources (
  key          text PRIMARY KEY,                      -- e.g. 'tab:growth_impact'
  label        text NOT NULL,                         -- Human label shown in UI
  category     text NOT NULL,                         -- 'nav' | 'tab' | 'action'
  supports_edit  boolean NOT NULL DEFAULT false,      -- show the Edit toggle?
  supports_scope boolean NOT NULL DEFAULT false,      -- show the scope dropdown?
  sort_order   int NOT NULL DEFAULT 100,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.permission_resources TO authenticated;
GRANT ALL    ON public.permission_resources TO service_role;
ALTER TABLE public.permission_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_select ON public.permission_resources;
CREATE POLICY pr_select ON public.permission_resources
  FOR SELECT TO authenticated USING (true);

-- Only L1 admins can insert / change resource definitions. The usual path
-- is a code migration, not the UI.
DROP POLICY IF EXISTS pr_write ON public.permission_resources;
CREATE POLICY pr_write ON public.permission_resources
  FOR ALL TO authenticated
  USING (public.current_security_level() = 1)
  WITH CHECK (public.current_security_level() = 1);

-- 2. Per-position toggles ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.position_permissions (
  position_name  text NOT NULL,
  resource_key   text NOT NULL REFERENCES public.permission_resources(key) ON DELETE CASCADE,
  can_view       boolean NOT NULL DEFAULT false,
  can_edit       boolean NOT NULL DEFAULT false,
  scope          text    NOT NULL DEFAULT 'self'
                 CHECK (scope IN ('all','own_department','own_team','self')),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  PRIMARY KEY (position_name, resource_key)
);

CREATE INDEX IF NOT EXISTS position_permissions_resource_idx
  ON public.position_permissions(resource_key);

GRANT SELECT ON public.position_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.position_permissions TO authenticated;
GRANT ALL ON public.position_permissions TO service_role;

ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;

-- Every authenticated user may read permission rows (needed so the client
-- can know what the signed-in user can see; it is not sensitive data).
DROP POLICY IF EXISTS pp_select ON public.position_permissions;
CREATE POLICY pp_select ON public.position_permissions
  FOR SELECT TO authenticated USING (true);

-- Only L1 admins may change the matrix.
DROP POLICY IF EXISTS pp_write ON public.position_permissions;
CREATE POLICY pp_write ON public.position_permissions
  FOR ALL TO authenticated
  USING (public.current_security_level() = 1)
  WITH CHECK (public.current_security_level() = 1);

-- updated_at trigger (reuse existing helper if it is already defined)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS position_permissions_touch ON public.position_permissions;
CREATE TRIGGER position_permissions_touch
  BEFORE UPDATE ON public.position_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Seed the resource registry ---------------------------------------------
INSERT INTO public.permission_resources (key, label, category, supports_edit, supports_scope, sort_order, description) VALUES
  -- Top-level navigation
  ('nav:dashboard',   'Dashboard',          'nav',    false, false,  10, 'Access the Dashboard home.'),
  ('nav:employees',   'Employees',          'nav',    false, true,   20, 'Browse the Employee Directory.'),
  ('nav:teams',       'Teams / By Department','nav',  false, true,   30, 'Browse employees grouped by department.'),
  ('nav:reports',     'Reports',            'nav',    false, false,  40, 'View analytics and reports.'),
  ('nav:settings',    'Settings',           'nav',    false, false,  50, 'Access Settings (users, lookups, permissions).'),

  -- Employee record tabs (view + edit toggles each, with scope on viewing)
  ('tab:profile',           'Employee Profile',            'tab', true, true, 110, 'Employee Profile section.'),
  ('tab:overview',          'Overview',                    'tab', true, true, 120, 'Performance Overview section.'),
  ('tab:interpersonal',     'Interpersonal Skills & Firm Fit','tab', true, true, 130, 'Interpersonal Skills tab.'),
  ('tab:growth_potential',  'Growth & Potential',          'tab', true, true, 140, 'Growth & Potential tab.'),
  ('tab:growth_impact',     'Growth & Impact',             'tab', true, true, 150, 'Growth & Impact journal tab.'),
  ('tab:manager_notes',     'Manager Notes',               'tab', true, true, 160, 'Management Notes tab.'),
  ('tab:pdr',               'PDR',                         'tab', true, true, 170, 'Performance Development Review tab.'),

  -- Discrete admin actions
  ('action:add_employee',       'Add new employees',          'action', false, false, 210, 'Create a new employee record.'),
  ('action:manage_lookups',     'Manage Departments / Positions','action', false, false, 220, 'Edit department and position lists.'),
  ('action:manage_users',       'Manage user accounts',       'action', false, false, 230, 'Create / edit / delete user logins.'),
  ('action:manage_permissions', 'Manage Permissions matrix',  'action', false, false, 240, 'Change this very table.'),
  ('action:import_data',        'Import data (CSV)',          'action', false, false, 250, 'Bulk import employees from CSV.'),
  ('action:pdr_lock',           'Start / end PDR shutdown',   'action', false, false, 310, 'Open or close the manager-only shutdown window on PDRs.'),
  ('action:pdr_archive',        'Archive PDR cycle',          'action', false, false, 320, 'Lock a cycle (Mid-Year / Year-End) and move it to the archive.')
ON CONFLICT (key) DO UPDATE
  SET label         = EXCLUDED.label,
      category      = EXCLUDED.category,
      supports_edit = EXCLUDED.supports_edit,
      supports_scope= EXCLUDED.supports_scope,
      sort_order    = EXCLUDED.sort_order,
      description   = EXCLUDED.description;

-- 4. Seed default per-position toggles for every position that already
-- exists in public.positions. We DO NOT delete or rename anything.
--
-- Default rules of thumb:
--   * Partner, HR, Operations & HR Coordinator  -> see & edit everything, scope=all
--   * Manager -> see all employee tabs incl. Manager Notes + PDR, scope=own_team,
--                can edit most, cannot lock/archive PDRs by default
--   * Senior Associate / Intermediate / Associate / anything else -> see only
--                their own record (Profile, Overview, Growth & Impact self-edit),
--                nothing else; scope=self
--
-- These are only INITIAL defaults -- the admin changes them in Settings.

DO $$
DECLARE
  v_pos text;
  v_is_admin boolean;      -- Partner / HR / Operations & HR Coordinator / Admin
  v_is_manager boolean;    -- Any position whose name starts with 'Manager'
BEGIN
  FOR v_pos IN SELECT DISTINCT name FROM public.positions LOOP
    v_is_admin   := lower(v_pos) IN ('partner','hr','operations & hr coordinator','admin','administrator');
    v_is_manager := lower(v_pos) LIKE 'manager%' OR lower(v_pos) LIKE '%manager';

    -- Navigation
    INSERT INTO public.position_permissions(position_name, resource_key, can_view, can_edit, scope) VALUES
      (v_pos, 'nav:dashboard', true,  false, CASE WHEN v_is_admin OR v_is_manager THEN 'all' ELSE 'self' END),
      (v_pos, 'nav:employees', v_is_admin OR v_is_manager, false,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'nav:teams',     v_is_admin OR v_is_manager, false,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'nav:reports',   v_is_admin, false,
         CASE WHEN v_is_admin THEN 'all' ELSE 'self' END),
      (v_pos, 'nav:settings',  v_is_admin, false, 'all')
    ON CONFLICT (position_name, resource_key) DO NOTHING;

    -- Employee tabs
    INSERT INTO public.position_permissions(position_name, resource_key, can_view, can_edit, scope) VALUES
      (v_pos, 'tab:profile',          true,  v_is_admin OR v_is_manager,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:overview',         true,  v_is_admin OR v_is_manager,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:interpersonal',    v_is_admin OR v_is_manager, v_is_admin OR v_is_manager,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:growth_potential', v_is_admin OR v_is_manager, v_is_admin OR v_is_manager,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:growth_impact',    true,  true,   -- employee can always edit own
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:manager_notes',    v_is_admin OR v_is_manager, v_is_admin OR v_is_manager,
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END),
      (v_pos, 'tab:pdr',              true,  v_is_admin OR v_is_manager OR true, -- everyone can see own PDR; shutdown gating lives elsewhere
         CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END)
    ON CONFLICT (position_name, resource_key) DO NOTHING;

    -- Discrete actions
    INSERT INTO public.position_permissions(position_name, resource_key, can_view, can_edit, scope) VALUES
      (v_pos, 'action:add_employee',       v_is_admin, false, 'all'),
      (v_pos, 'action:manage_lookups',     v_is_admin, false, 'all'),
      (v_pos, 'action:manage_users',       v_is_admin, false, 'all'),
      (v_pos, 'action:manage_permissions', v_is_admin, false, 'all'),
      (v_pos, 'action:import_data',        v_is_admin, false, 'all'),
      (v_pos, 'action:pdr_lock',           v_is_admin, false, 'all'),
      (v_pos, 'action:pdr_archive',        v_is_admin, false, 'all')
    ON CONFLICT (position_name, resource_key) DO NOTHING;
  END LOOP;
END $$;
