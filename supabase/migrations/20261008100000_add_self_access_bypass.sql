-- Phase 7J — Self-access bypass
--
-- Fixes: mid/senior managers (Associate Manager, Manager, Senior Manager,
-- Principal) could not see or edit their OWN employee record because their
-- own job title is not listed in their own position's visible_position_titles
-- filter. When they loaded "/my-record" the RLS returned zero rows and the
-- app showed "No employee record linked to your login."
--
-- Fix: both can_view_employee_row() and can_view_notes() now return TRUE
-- immediately when the target row IS the caller's own employee record,
-- regardless of what the position's access rule says. Every signed-in user
-- can always see themselves.
--
-- L1 admin bypass (Phase 7H) and the "no linked employee / no access rule"
-- fallbacks are preserved as-is.

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
  -- 0. Always allow users to see their own employee record. This bypass must
  --    come before the position-based rules so that a manager whose own job
  --    title isn't in their rule's visible_titles list can still see their
  --    own profile, overview, interpersonal, growth and notes.
  v_uid := public.current_user_employee_id();
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN
    RETURN true;
  END IF;

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
  -- 0. Always allow users to see notes on their own record.
  v_uid := public.current_user_employee_id();
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN
    RETURN true;
  END IF;

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
