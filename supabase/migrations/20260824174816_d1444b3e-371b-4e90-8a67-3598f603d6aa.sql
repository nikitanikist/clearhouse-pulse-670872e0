-- ============================================================================
-- Phase 7B — Dynamic Access Rules engine (backend only)
-- Replaces the hardcoded 5/6-level access model with per-position rules that
-- RLS reads at query time. Old plumbing (profiles.security_level,
-- current_security_level(), can_view_employee(text)) is kept as fallback.
--
-- Verification hints (run in SQL editor while signed in as any user):
--   SELECT id, name, position FROM public.employees;     -- everyone caller may see
--   SELECT * FROM public.management_notes;               -- notes caller may see (may be wider)
-- ============================================================================

-- 1. New table ---------------------------------------------------------------
CREATE TABLE public.access_rules (
  position text PRIMARY KEY,
  visibility_scope text NOT NULL CHECK (visibility_scope IN ('all','own_department','own_location','own_reports','own_reports_tree','self','custom')),
  visible_position_titles jsonb DEFAULT '[]'::jsonb,
  notes_scope text NOT NULL CHECK (notes_scope IN ('all','own_department','own_location','own_reports','own_reports_tree','self','custom')),
  notes_visible_position_titles jsonb DEFAULT '[]'::jsonb,
  can_manage_access_rules boolean DEFAULT false,
  can_manage_lookups boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_import_data boolean DEFAULT false,
  can_add_employee boolean DEFAULT false,
  can_edit_employee_profile boolean DEFAULT false,
  can_edit_performance boolean DEFAULT false,
  can_edit_interpersonal boolean DEFAULT false,
  can_edit_growth boolean DEFAULT false,
  can_edit_notes boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

GRANT SELECT ON public.access_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_rules TO authenticated;
GRANT ALL ON public.access_rules TO service_role;

-- 2. Helper functions (SECURITY DEFINER so RLS policies can call them safely) -
CREATE OR REPLACE FUNCTION public.current_user_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_position()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT position FROM public.employees
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.employees
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_location()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT location::text FROM public.employees
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_name()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name FROM public.employees
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

-- Core row-visibility engine -------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_employee_row(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pos    text;
  v_scope  text;
  v_titles jsonb;
  v_emp    public.employees%ROWTYPE;
  v_uid    uuid;
BEGIN
  -- 1-2. Caller's position; fallback to old L1 admin semantics if none.
  v_pos := public.current_user_position();
  IF v_pos IS NULL THEN
    RETURN public.current_security_level() = 1;
  END IF;

  -- 3. Rule for that position; same fallback if missing.
  SELECT visibility_scope, visible_position_titles
    INTO v_scope, v_titles
    FROM public.access_rules
   WHERE position = v_pos;
  IF NOT FOUND THEN
    RETURN public.current_security_level() = 1;
  END IF;

  -- 4. Target employee row.
  SELECT * INTO v_emp FROM public.employees WHERE id = emp_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_uid := public.current_user_employee_id();

  -- 5. Apply scope.
  CASE v_scope
    WHEN 'all' THEN
      RETURN true;
    WHEN 'self' THEN
      RETURN v_emp.id = v_uid;
    WHEN 'own_department' THEN
      RETURN v_emp.department = public.current_user_department()
         AND (coalesce(v_titles, '[]'::jsonb) = '[]'::jsonb OR v_titles ? v_emp.position);
    WHEN 'own_location' THEN
      RETURN v_emp.location::text = public.current_user_location()
         AND (coalesce(v_titles, '[]'::jsonb) = '[]'::jsonb OR v_titles ? v_emp.position);
    WHEN 'own_reports' THEN
      RETURN lower(trim(v_emp.supervisor)) = lower(trim(coalesce(public.current_user_name(), '')));
    WHEN 'own_reports_tree' THEN
      RETURN EXISTS (
        WITH RECURSIVE chain AS (
          SELECT e.id, e.name, e.supervisor, 1 AS depth
            FROM public.employees e WHERE e.id = emp_id
          UNION ALL
          SELECT e.id, e.name, e.supervisor, c.depth + 1
            FROM public.employees e
            JOIN chain c ON lower(trim(e.name)) = lower(trim(c.supervisor))
           WHERE c.depth < 10
        )
        SELECT 1 FROM chain
         WHERE depth > 1
           AND lower(trim(name)) = lower(trim(coalesce(public.current_user_name(), '')))
      );
    WHEN 'custom' THEN
      RETURN coalesce(v_titles, '[]'::jsonb) ? v_emp.position;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Notes visibility: same shape, reads notes_scope / notes_visible_position_titles
CREATE OR REPLACE FUNCTION public.can_view_notes(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pos    text;
  v_scope  text;
  v_titles jsonb;
  v_emp    public.employees%ROWTYPE;
  v_uid    uuid;
BEGIN
  v_pos := public.current_user_position();
  IF v_pos IS NULL THEN
    RETURN public.current_security_level() = 1;
  END IF;

  SELECT notes_scope, notes_visible_position_titles
    INTO v_scope, v_titles
    FROM public.access_rules
   WHERE position = v_pos;
  IF NOT FOUND THEN
    RETURN public.current_security_level() = 1;
  END IF;

  SELECT * INTO v_emp FROM public.employees WHERE id = emp_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_uid := public.current_user_employee_id();

  CASE v_scope
    WHEN 'all' THEN
      RETURN true;
    WHEN 'self' THEN
      RETURN v_emp.id = v_uid;
    WHEN 'own_department' THEN
      RETURN v_emp.department = public.current_user_department()
         AND (coalesce(v_titles, '[]'::jsonb) = '[]'::jsonb OR v_titles ? v_emp.position);
    WHEN 'own_location' THEN
      RETURN v_emp.location::text = public.current_user_location()
         AND (coalesce(v_titles, '[]'::jsonb) = '[]'::jsonb OR v_titles ? v_emp.position);
    WHEN 'own_reports' THEN
      RETURN lower(trim(v_emp.supervisor)) = lower(trim(coalesce(public.current_user_name(), '')));
    WHEN 'own_reports_tree' THEN
      RETURN EXISTS (
        WITH RECURSIVE chain AS (
          SELECT e.id, e.name, e.supervisor, 1 AS depth
            FROM public.employees e WHERE e.id = emp_id
          UNION ALL
          SELECT e.id, e.name, e.supervisor, c.depth + 1
            FROM public.employees e
            JOIN chain c ON lower(trim(e.name)) = lower(trim(c.supervisor))
           WHERE c.depth < 10
        )
        SELECT 1 FROM chain
         WHERE depth > 1
           AND lower(trim(name)) = lower(trim(coalesce(public.current_user_name(), '')))
      );
    WHEN 'custom' THEN
      RETURN coalesce(v_titles, '[]'::jsonb) ? v_emp.position;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Capability flags, sourced from access_rules for the caller's position ------
CREATE OR REPLACE FUNCTION public.current_user_can(cap text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pos  text;
  v_rule public.access_rules%ROWTYPE;
BEGIN
  v_pos := public.current_user_position();
  IF v_pos IS NULL THEN
    RETURN public.current_security_level() = 1;
  END IF;

  SELECT * INTO v_rule FROM public.access_rules WHERE position = v_pos;
  IF NOT FOUND THEN
    RETURN public.current_security_level() = 1;
  END IF;

  CASE cap
    WHEN 'can_manage_access_rules'   THEN RETURN v_rule.can_manage_access_rules;
    WHEN 'can_manage_lookups'        THEN RETURN v_rule.can_manage_lookups;
    WHEN 'can_manage_users'          THEN RETURN v_rule.can_manage_users;
    WHEN 'can_import_data'           THEN RETURN v_rule.can_import_data;
    WHEN 'can_add_employee'          THEN RETURN v_rule.can_add_employee;
    WHEN 'can_edit_employee_profile' THEN RETURN v_rule.can_edit_employee_profile;
    WHEN 'can_edit_performance'      THEN RETURN v_rule.can_edit_performance;
    WHEN 'can_edit_interpersonal'    THEN RETURN v_rule.can_edit_interpersonal;
    WHEN 'can_edit_growth'           THEN RETURN v_rule.can_edit_growth;
    WHEN 'can_edit_notes'            THEN RETURN v_rule.can_edit_notes;
    ELSE RETURN false;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_position() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_location() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_employee_row(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_notes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can(text) TO authenticated;

-- 3. Seed missing lookup positions -------------------------------------------
INSERT INTO public.positions (name, visibility_tier)
SELECT 'India Lead', 2
WHERE NOT EXISTS (SELECT 1 FROM public.positions WHERE name = 'India Lead');

INSERT INTO public.positions (name, visibility_tier)
SELECT 'Human Resources', 1
WHERE NOT EXISTS (SELECT 1 FROM public.positions WHERE name = 'Human Resources');

-- 4. Seed access rules (Bryon's spec) ----------------------------------------
INSERT INTO public.access_rules (position, visibility_scope, visible_position_titles, notes_scope, notes_visible_position_titles,
  can_manage_access_rules, can_manage_lookups, can_manage_users, can_import_data, can_add_employee,
  can_edit_employee_profile, can_edit_performance, can_edit_interpersonal, can_edit_growth, can_edit_notes)
VALUES
  ('Partner', 'all', '[]'::jsonb, 'all', '[]'::jsonb,
   true, true, true, true, true, true, true, true, true, true),
  ('Principal', 'own_department',
   '["Senior Manager","Manager","Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   'custom',
   '["Senior Manager","Manager","Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   false, false, false, false, false, true, true, true, true, true),
  ('Senior Manager', 'own_department',
   '["Manager","Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   'custom',
   '["Manager","Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   false, false, false, false, false, true, true, true, true, true),
  ('Manager', 'own_department',
   '["Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   'custom',
   '["Associate Manager","Senior Associate","Intermediate","Associate"]'::jsonb,
   false, false, false, false, false, true, true, true, true, true),
  ('Associate Manager', 'own_department',
   '["Senior Associate","Intermediate","Associate"]'::jsonb,
   'custom',
   '["Senior Associate","Intermediate","Associate"]'::jsonb,
   false, false, false, false, false, true, true, true, true, true),
  ('India Lead', 'own_location', '[]'::jsonb, 'own_location', '[]'::jsonb,
   false, false, false, false, false, true, true, true, true, true),
  ('Human Resources', 'all', '[]'::jsonb, 'all', '[]'::jsonb,
   true, true, true, true, true, true, true, true, true, true)
ON CONFLICT (position) DO UPDATE SET
  visibility_scope = EXCLUDED.visibility_scope,
  visible_position_titles = EXCLUDED.visible_position_titles,
  notes_scope = EXCLUDED.notes_scope,
  notes_visible_position_titles = EXCLUDED.notes_visible_position_titles,
  can_manage_access_rules = EXCLUDED.can_manage_access_rules,
  can_manage_lookups = EXCLUDED.can_manage_lookups,
  can_manage_users = EXCLUDED.can_manage_users,
  can_import_data = EXCLUDED.can_import_data,
  can_add_employee = EXCLUDED.can_add_employee,
  can_edit_employee_profile = EXCLUDED.can_edit_employee_profile,
  can_edit_performance = EXCLUDED.can_edit_performance,
  can_edit_interpersonal = EXCLUDED.can_edit_interpersonal,
  can_edit_growth = EXCLUDED.can_edit_growth,
  can_edit_notes = EXCLUDED.can_edit_notes;

-- Every OTHER existing position: self-only
INSERT INTO public.access_rules (position, visibility_scope, notes_scope)
SELECT p.name, 'self', 'self'
  FROM public.positions p
 WHERE p.name NOT IN ('Partner','Principal','Senior Manager','Manager','Associate Manager','India Lead','Human Resources')
ON CONFLICT (position) DO NOTHING;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_access_rules_updated ON public.access_rules;
CREATE TRIGGER trg_access_rules_updated
BEFORE UPDATE ON public.access_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS on access_rules ------------------------------------------------------
ALTER TABLE public.access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_rules_select ON public.access_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY access_rules_insert ON public.access_rules
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can('can_manage_access_rules'));

CREATE POLICY access_rules_update ON public.access_rules
  FOR UPDATE TO authenticated
  USING (public.current_user_can('can_manage_access_rules'))
  WITH CHECK (public.current_user_can('can_manage_access_rules'));

CREATE POLICY access_rules_delete ON public.access_rules
  FOR DELETE TO authenticated USING (public.current_user_can('can_manage_access_rules'));

-- 6. Rewrite existing RLS policies (replace, not duplicate) -------------------

-- employees
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
  FOR SELECT TO authenticated USING (public.can_view_employee_row(id));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can('can_add_employee'));

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees
  FOR UPDATE TO authenticated
  USING (public.can_view_employee_row(id))
  WITH CHECK (public.can_view_employee_row(id));

-- employee_core_competencies
DROP POLICY IF EXISTS comp_select ON public.employee_core_competencies;
CREATE POLICY comp_select ON public.employee_core_competencies
  FOR SELECT TO authenticated USING (public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS comp_insert ON public.employee_core_competencies;
CREATE POLICY comp_insert ON public.employee_core_competencies
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance'));

DROP POLICY IF EXISTS comp_update ON public.employee_core_competencies;
CREATE POLICY comp_update ON public.employee_core_competencies
  FOR UPDATE TO authenticated
  USING (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance'))
  WITH CHECK (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance'));

-- employee_dev_plan_rows
DROP POLICY IF EXISTS devplan_select ON public.employee_dev_plan_rows;
CREATE POLICY devplan_select ON public.employee_dev_plan_rows
  FOR SELECT TO authenticated USING (public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS devplan_insert ON public.employee_dev_plan_rows;
CREATE POLICY devplan_insert ON public.employee_dev_plan_rows
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_growth'));

DROP POLICY IF EXISTS devplan_delete ON public.employee_dev_plan_rows;
CREATE POLICY devplan_delete ON public.employee_dev_plan_rows
  FOR DELETE TO authenticated
  USING (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_growth'));

-- employee_interpersonal
DROP POLICY IF EXISTS interp_select ON public.employee_interpersonal;
CREATE POLICY interp_select ON public.employee_interpersonal
  FOR SELECT TO authenticated USING (public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS interp_insert ON public.employee_interpersonal;
CREATE POLICY interp_insert ON public.employee_interpersonal
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal'));

DROP POLICY IF EXISTS interp_update ON public.employee_interpersonal;
CREATE POLICY interp_update ON public.employee_interpersonal
  FOR UPDATE TO authenticated
  USING (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal'))
  WITH CHECK (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal'));

DROP POLICY IF EXISTS interp_delete ON public.employee_interpersonal;
CREATE POLICY interp_delete ON public.employee_interpersonal
  FOR DELETE TO authenticated
  USING (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal'));

-- management_notes (uses the SEPARATE, wider notes function)
DROP POLICY IF EXISTS notes_select ON public.management_notes;
CREATE POLICY notes_select ON public.management_notes
  FOR SELECT TO authenticated USING (public.can_view_notes(employee_id));

DROP POLICY IF EXISTS notes_insert ON public.management_notes;
CREATE POLICY notes_insert ON public.management_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes'));

DROP POLICY IF EXISTS notes_update ON public.management_notes;
CREATE POLICY notes_update ON public.management_notes
  FOR UPDATE TO authenticated
  USING (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes'))
  WITH CHECK (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes'));

DROP POLICY IF EXISTS notes_delete ON public.management_notes;
CREATE POLICY notes_delete ON public.management_notes
  FOR DELETE TO authenticated
  USING (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes'));

-- pdr_documents
DROP POLICY IF EXISTS pdr_select ON public.pdr_documents;
CREATE POLICY pdr_select ON public.pdr_documents
  FOR SELECT TO authenticated USING (public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS pdr_insert ON public.pdr_documents;
CREATE POLICY pdr_insert ON public.pdr_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS pdr_delete ON public.pdr_documents;
CREATE POLICY pdr_delete ON public.pdr_documents
  FOR DELETE TO authenticated USING (public.can_view_employee_row(employee_id));