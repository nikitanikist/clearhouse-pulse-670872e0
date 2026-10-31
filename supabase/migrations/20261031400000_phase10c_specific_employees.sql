-- Phase 10C — "Specific employees" scope.
--
-- Admin wants a 6th scope option: pick N employees explicitly. The signed-in
-- user whose matrix row (position OR override) carries scope='specific_employees'
-- sees only the employees listed in target_employee_ids for that cell.
--
-- Also closes the Phase 10A gap: the 3 locked tabs (Interpersonal /
-- Growth & Potential / Manager Notes) have been enforced through
-- can_see_linked_only() which ignored matrix overrides. We replace that
-- single hard-coded rule with a scope-routing can_see_tab(emp_id, resource)
-- helper that honors every scope value AND respects per-user overrides via
-- current_user_matrix.

-- 1. New column on both tables ------------------------------------------
ALTER TABLE public.position_permissions
  ADD COLUMN IF NOT EXISTS target_employee_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_permission_overrides
  ADD COLUMN IF NOT EXISTS target_employee_ids uuid[] NOT NULL DEFAULT '{}';

-- 2. Add specific_employees to scope CHECK -----------------------------
ALTER TABLE public.position_permissions
  DROP CONSTRAINT IF EXISTS position_permissions_scope_check;
ALTER TABLE public.position_permissions
  ADD CONSTRAINT position_permissions_scope_check
  CHECK (scope IN ('all','own_department','own_team','self','linked_manager_only','specific_employees'));

ALTER TABLE public.user_permission_overrides
  DROP CONSTRAINT IF EXISTS user_permission_overrides_scope_check;
ALTER TABLE public.user_permission_overrides
  ADD CONSTRAINT user_permission_overrides_scope_check
  CHECK (scope IN ('all','own_department','own_team','self','linked_manager_only','specific_employees'));

-- 3. Current user's matrix cell -- now also returns the target list ----
-- Replaces the Phase 10B version. Override wins; no row -> no matrix cell
-- (caller falls back to legacy supervisor-chain).
CREATE OR REPLACE FUNCTION public.current_user_matrix(resource text)
RETURNS TABLE(can_view boolean, scope text, target_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT upo.can_view, upo.scope, upo.target_employee_ids
    FROM public.user_permission_overrides upo
    WHERE upo.user_id = auth.uid() AND upo.resource_key = resource
  UNION ALL
  SELECT pp.can_view, pp.scope, pp.target_employee_ids
    FROM public.position_permissions pp
    WHERE pp.position_name = public.current_user_position()
      AND pp.resource_key = resource
      AND NOT EXISTS (
        SELECT 1 FROM public.user_permission_overrides upo2
        WHERE upo2.user_id = auth.uid() AND upo2.resource_key = resource
      )
  LIMIT 1
$$;

-- 4. Scope-routing visibility: given a target employee + a resource, is the
-- signed-in user allowed to see it? Handles ALL scope values AND the
-- L1 admin + self-check safety contracts.
CREATE OR REPLACE FUNCTION public.can_see_tab(emp_id uuid, resource text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
  v_target public.employees%ROWTYPE;
  v_can_view boolean;
  v_scope text;
  v_targets uuid[];
BEGIN
  -- Safety nets first
  IF public.current_security_level() = 1 THEN RETURN true; END IF;
  v_uid := public.current_user_employee_id();
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN RETURN true; END IF;
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT c.can_view, c.scope, c.target_ids INTO v_can_view, v_scope, v_targets
    FROM public.current_user_matrix(resource) c;

  IF v_can_view IS NULL OR v_can_view = false THEN
    RETURN false;
  END IF;

  IF v_scope = 'all' THEN
    RETURN true;
  ELSIF v_scope = 'self' THEN
    RETURN false; -- self already handled above
  ELSIF v_scope = 'linked_manager_only' THEN
    RETURN public.am_i_linked_manager(emp_id);
  ELSIF v_scope = 'own_team' THEN
    RETURN public.is_in_my_supervisor_chain(emp_id);
  ELSIF v_scope = 'own_department' THEN
    SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
    SELECT * INTO v_target FROM public.employees WHERE id = emp_id;
    RETURN v_me.department IS NOT NULL
       AND v_target.department IS NOT NULL
       AND lower(trim(v_me.department)) = lower(trim(v_target.department));
  ELSIF v_scope = 'specific_employees' THEN
    RETURN emp_id = ANY(v_targets);
  END IF;

  RETURN false;
END;
$$;

-- 5. Rewire can_view_employee_row to use the same routing ---------------
-- Previously it had its own big IF ladder. Now it just defers to
-- can_see_tab for the 'nav:employees' resource, so EVERY visibility
-- surface shares one implementation.
CREATE OR REPLACE FUNCTION public.can_view_employee_row(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. L1 admin bypass
  IF public.current_security_level() = 1 THEN RETURN true; END IF;

  -- 2. Self-check (Phase 7J)
  IF public.current_user_employee_id() IS NOT NULL
     AND emp_id = public.current_user_employee_id() THEN
    RETURN true;
  END IF;

  -- 3. If the user has a matrix cell for nav:employees, use it.
  IF EXISTS (
    SELECT 1 FROM public.current_user_matrix('nav:employees') c
    WHERE c.can_view IS NOT NULL
  ) THEN
    RETURN public.can_see_tab(emp_id, 'nav:employees');
  END IF;

  -- 4. Phase 7L fallback: top-level or supervisor-chain.
  IF public.am_i_top_level() THEN RETURN true; END IF;
  RETURN public.is_in_my_supervisor_chain(emp_id);
END;
$$;

-- 6. Rewire the 3 locked tabs' RLS to use can_see_tab with their resource.
-- This closes the gap where matrix overrides were ignored at the DB layer.
DROP POLICY IF EXISTS employee_interpersonal_select ON public.employee_interpersonal;
CREATE POLICY employee_interpersonal_select
  ON public.employee_interpersonal FOR SELECT TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:interpersonal'));
DROP POLICY IF EXISTS employee_interpersonal_write ON public.employee_interpersonal;
CREATE POLICY employee_interpersonal_write
  ON public.employee_interpersonal FOR ALL TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:interpersonal'))
  WITH CHECK (public.can_see_tab(employee_id, 'tab:interpersonal'));

DROP POLICY IF EXISTS employee_dev_plan_rows_select ON public.employee_dev_plan_rows;
CREATE POLICY employee_dev_plan_rows_select
  ON public.employee_dev_plan_rows FOR SELECT TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:growth_potential'));
DROP POLICY IF EXISTS employee_dev_plan_rows_write ON public.employee_dev_plan_rows;
CREATE POLICY employee_dev_plan_rows_write
  ON public.employee_dev_plan_rows FOR ALL TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:growth_potential'))
  WITH CHECK (public.can_see_tab(employee_id, 'tab:growth_potential'));

DROP POLICY IF EXISTS management_notes_select ON public.management_notes;
CREATE POLICY management_notes_select
  ON public.management_notes FOR SELECT TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:manager_notes'));
DROP POLICY IF EXISTS management_notes_write ON public.management_notes;
CREATE POLICY management_notes_write
  ON public.management_notes FOR ALL TO authenticated
  USING (public.can_see_tab(employee_id, 'tab:manager_notes'))
  WITH CHECK (public.can_see_tab(employee_id, 'tab:manager_notes'));

-- 7. Make the effective-matrix function also return the target list for UI
CREATE OR REPLACE FUNCTION public.effective_matrix_for_user(target_user_id uuid)
RETURNS TABLE(
  resource_key   text,
  resource_label text,
  category       text,
  can_view       boolean,
  can_edit       boolean,
  scope          text,
  target_employee_ids uuid[],
  is_overridden  boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_position AS (
    SELECT e.position
    FROM auth.users u
    LEFT JOIN public.employees e ON lower(trim(e.email)) = lower(trim(u.email))
    WHERE u.id = target_user_id
    LIMIT 1
  )
  SELECT
    pr.key, pr.label, pr.category,
    COALESCE(upo.can_view, pp.can_view, false),
    COALESCE(upo.can_edit, pp.can_edit, false),
    COALESCE(upo.scope,    pp.scope,    'self'),
    COALESCE(upo.target_employee_ids, pp.target_employee_ids, '{}'::uuid[]),
    (upo.user_id IS NOT NULL)
  FROM public.permission_resources pr
  LEFT JOIN public.position_permissions pp
    ON pp.resource_key = pr.key
   AND pp.position_name = (SELECT position FROM my_position)
  LEFT JOIN public.user_permission_overrides upo
    ON upo.resource_key = pr.key
   AND upo.user_id = target_user_id
  ORDER BY pr.sort_order
$$;
