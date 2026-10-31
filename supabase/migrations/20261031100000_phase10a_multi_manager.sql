-- Phase 10A — Multi-manager list + linked_manager_only visibility
--
-- Bryon (Oct 30 emails) tightened the 3 tabs — Interpersonal Skills & Firm
-- Fit, Growth & Potential, Manager Notes — to "only visible to the
-- manager(s) linked to that employee." At the same time, "linked" needs to
-- support more than one person (today we only had supervisor + co_supervisor).
--
-- This migration:
--   1. Creates employee_managers: a many-to-many list of linked managers
--      per employee. Backfilled from supervisor + co_supervisor so nothing
--      downstream breaks on day 1.
--   2. Adds a new scope value 'linked_manager_only' that the permissions
--      matrix can store; UI will render it as the default for the 3 tabs.
--   3. Adds am_i_linked_manager(emp_id) SQL helper.
--   4. Rewrites RLS on employee_interpersonal, employee_dev_plan_rows and
--      management_notes to enforce the new rule. L1 admin bypass stays.

-- 1. Many-to-many table of managers --------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_managers (
  employee_id  uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_name text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, manager_name)
);
CREATE INDEX IF NOT EXISTS employee_managers_emp_idx
  ON public.employee_managers(employee_id, sort_order);
CREATE INDEX IF NOT EXISTS employee_managers_name_idx
  ON public.employee_managers(lower(trim(manager_name)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_managers TO authenticated;
GRANT ALL ON public.employee_managers TO service_role;
ALTER TABLE public.employee_managers ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read manager links (needed so the client can
-- resolve "am I linked?" for people they can already see).
DROP POLICY IF EXISTS employee_managers_select ON public.employee_managers;
CREATE POLICY employee_managers_select
  ON public.employee_managers FOR SELECT TO authenticated USING (true);

-- Writes: L1 admin, OR anyone with can_edit on tab:profile (same gate as
-- the Employee Profile edit form)
DROP POLICY IF EXISTS employee_managers_write ON public.employee_managers;
CREATE POLICY employee_managers_write
  ON public.employee_managers FOR ALL TO authenticated
  USING (
    public.current_security_level() = 1
    OR EXISTS (
      SELECT 1 FROM public.position_permissions pp
      WHERE pp.position_name = public.current_user_position()
        AND pp.resource_key  = 'tab:profile'
        AND pp.can_edit = true
    )
  )
  WITH CHECK (
    public.current_security_level() = 1
    OR EXISTS (
      SELECT 1 FROM public.position_permissions pp
      WHERE pp.position_name = public.current_user_position()
        AND pp.resource_key  = 'tab:profile'
        AND pp.can_edit = true
    )
  );

-- 2. Backfill from existing supervisor + co_supervisor text columns -------
INSERT INTO public.employee_managers (employee_id, manager_name, sort_order)
SELECT id, trim(supervisor), 0
FROM public.employees
WHERE supervisor IS NOT NULL AND trim(supervisor) <> ''
ON CONFLICT (employee_id, manager_name) DO NOTHING;

INSERT INTO public.employee_managers (employee_id, manager_name, sort_order)
SELECT id, trim(co_supervisor), 1
FROM public.employees
WHERE co_supervisor IS NOT NULL AND trim(co_supervisor) <> ''
ON CONFLICT (employee_id, manager_name) DO NOTHING;

-- 3. Add linked_manager_only to position_permissions.scope CHECK ---------
ALTER TABLE public.position_permissions
  DROP CONSTRAINT IF EXISTS position_permissions_scope_check;
ALTER TABLE public.position_permissions
  ADD CONSTRAINT position_permissions_scope_check
  CHECK (scope IN ('all','own_department','own_team','self','linked_manager_only'));

-- 4. Default the 3 locked tabs to linked_manager_only for every position
UPDATE public.position_permissions
SET scope = 'linked_manager_only'
WHERE resource_key IN ('tab:interpersonal','tab:growth_potential','tab:manager_notes')
  AND scope IN ('all','own_team','own_department');
-- (We leave scope='self' rows untouched: positions whose default was
--  "see nothing" stay that way.)

-- 5. Helper: am I in the given employee's manager list? -------------------
CREATE OR REPLACE FUNCTION public.am_i_linked_manager(emp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_managers em
    JOIN public.employees me ON me.id = public.current_user_employee_id()
    WHERE em.employee_id = emp_id
      AND lower(trim(em.manager_name)) = lower(trim(me.name))
  )
$$;

-- 6. Combined visibility for the 3 locked tabs ---------------------------
-- Rule: L1 admin bypass, OR I am a linked manager of the target employee.
CREATE OR REPLACE FUNCTION public.can_see_linked_only(emp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.current_security_level() = 1
    OR public.am_i_linked_manager(emp_id)
$$;

-- 7. Tighten RLS on the 3 affected tables --------------------------------
--
-- Prior rule: can_view_employee_row(emp_id) (supervisor-chain + top-level
-- + matrix). New rule: can_see_linked_only(emp_id). Writes stay matching.

-- employee_interpersonal
DROP POLICY IF EXISTS employee_interpersonal_select ON public.employee_interpersonal;
CREATE POLICY employee_interpersonal_select
  ON public.employee_interpersonal
  FOR SELECT TO authenticated
  USING (public.can_see_linked_only(employee_id));

DROP POLICY IF EXISTS employee_interpersonal_write ON public.employee_interpersonal;
CREATE POLICY employee_interpersonal_write
  ON public.employee_interpersonal
  FOR ALL TO authenticated
  USING (public.can_see_linked_only(employee_id))
  WITH CHECK (public.can_see_linked_only(employee_id));

-- employee_dev_plan_rows (Growth & Potential development plan)
DROP POLICY IF EXISTS employee_dev_plan_rows_select ON public.employee_dev_plan_rows;
CREATE POLICY employee_dev_plan_rows_select
  ON public.employee_dev_plan_rows
  FOR SELECT TO authenticated
  USING (public.can_see_linked_only(employee_id));

DROP POLICY IF EXISTS employee_dev_plan_rows_write ON public.employee_dev_plan_rows;
CREATE POLICY employee_dev_plan_rows_write
  ON public.employee_dev_plan_rows
  FOR ALL TO authenticated
  USING (public.can_see_linked_only(employee_id))
  WITH CHECK (public.can_see_linked_only(employee_id));

-- management_notes
DROP POLICY IF EXISTS management_notes_select ON public.management_notes;
CREATE POLICY management_notes_select
  ON public.management_notes
  FOR SELECT TO authenticated
  USING (public.can_see_linked_only(employee_id));

DROP POLICY IF EXISTS management_notes_write ON public.management_notes;
CREATE POLICY management_notes_write
  ON public.management_notes
  FOR ALL TO authenticated
  USING (public.can_see_linked_only(employee_id))
  WITH CHECK (public.can_see_linked_only(employee_id));
