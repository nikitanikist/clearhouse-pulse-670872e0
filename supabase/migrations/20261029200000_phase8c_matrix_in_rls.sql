-- Phase 8C — Permissions matrix enforcement in the database.
--
-- Wires the matrix built in Phase 8A/8B into RLS so that toggling a
-- position's row in Settings actually controls what the database returns,
-- not just what the UI shows.
--
-- Safety contracts preserved from Phase 7L:
--   1. L1 admin bypass is FIRST -- a misconfigured matrix can never lock
--      Sarb / Emily / Nikist out.
--   2. Self-check (Phase 7J) stays -- every user always sees their own row.
--   3. Positions without a matrix row fall back to the Phase 7L
--      supervisor-chain rule, so onboarding a brand-new position (before an
--      admin configures its matrix) never breaks the live portal.
--
-- Only can_view_employee_row() is rewritten. All downstream tables
-- (employee_interpersonal, management_notes, growth_impact_entries, etc.)
-- cascade their RLS off this function and inherit the new behaviour for free.

-- 1. Helper: current user's position (via email -> employees.position) -------
CREATE OR REPLACE FUNCTION public.current_user_position()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.position
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- 2. Matrix row lookup for the current user ---------------------------------
-- Returns the (can_view, scope) pair for the signed-in user's position
-- against a given resource. NULL out params mean "no row" -> caller falls
-- back to the Phase 7L rule.
CREATE OR REPLACE FUNCTION public.current_user_matrix(resource text)
RETURNS TABLE(can_view boolean, scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pp.can_view, pp.scope
  FROM public.position_permissions pp
  WHERE pp.position_name = public.current_user_position()
    AND pp.resource_key  = resource
  LIMIT 1
$$;

-- 3. Phase 7L supervisor-chain check (extracted for reuse as fallback) ------
CREATE OR REPLACE FUNCTION public.is_in_my_supervisor_chain(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
BEGIN
  v_uid := public.current_user_employee_id();
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN EXISTS (
    WITH RECURSIVE chain AS (
      SELECT e.id, e.name, e.supervisor, e.co_supervisor, 0 AS depth
      FROM public.employees e
      WHERE e.id = emp_id
      UNION ALL
      SELECT sup.id, sup.name, sup.supervisor, sup.co_supervisor, c.depth + 1
      FROM chain c
      JOIN public.employees sup ON (
        lower(trim(sup.name)) = lower(trim(c.supervisor))
        OR (c.co_supervisor IS NOT NULL
            AND trim(c.co_supervisor) <> ''
            AND lower(trim(sup.name)) = lower(trim(c.co_supervisor)))
      )
      WHERE c.depth < 15
    )
    SELECT 1 FROM chain
    WHERE depth > 0
      AND lower(trim(name)) = lower(trim(v_me.name))
  );
END;
$$;

-- 4. Phase 7L fallback: top-level users see everyone -----------------------
CREATE OR REPLACE FUNCTION public.am_i_top_level()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
BEGIN
  v_uid := public.current_user_employee_id();
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN (v_me.supervisor    IS NULL OR trim(v_me.supervisor)    = '')
     AND (v_me.co_supervisor IS NULL OR trim(v_me.co_supervisor) = '');
END;
$$;

-- 5. Phase 8C: matrix-first can_view_employee_row --------------------------
CREATE OR REPLACE FUNCTION public.can_view_employee_row(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
  v_target public.employees%ROWTYPE;
  v_can_view boolean;
  v_scope    text;
BEGIN
  -- 1. L1 admin bypass (safety net -- must stay FIRST)
  IF public.current_security_level() = 1 THEN
    RETURN true;
  END IF;

  v_uid := public.current_user_employee_id();

  -- 2. Self-check (Phase 7J contract)
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN
    RETURN true;
  END IF;

  -- 3. No linked employee record -> no access
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 4. Look up matrix row for this user's position / nav:employees
  SELECT c.can_view, c.scope INTO v_can_view, v_scope
    FROM public.current_user_matrix('nav:employees') c;

  IF v_can_view IS NOT NULL THEN
    -- Matrix row exists: it is the source of truth.
    IF v_can_view = false THEN
      RETURN false;
    END IF;

    IF v_scope = 'all' THEN
      RETURN true;
    ELSIF v_scope = 'self' THEN
      RETURN false; -- self already handled above
    ELSIF v_scope = 'own_department' THEN
      SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
      SELECT * INTO v_target FROM public.employees WHERE id = emp_id;
      RETURN v_me.department IS NOT NULL
         AND v_target.department IS NOT NULL
         AND lower(trim(v_me.department)) = lower(trim(v_target.department));
    ELSIF v_scope = 'own_team' THEN
      RETURN public.is_in_my_supervisor_chain(emp_id);
    ELSE
      RETURN false;
    END IF;
  END IF;

  -- 5. No matrix row for this position -> Phase 7L fallback.
  --    (Protects any new / renamed position that hasn't been seeded yet.)
  IF public.am_i_top_level() THEN
    RETURN true;
  END IF;
  RETURN public.is_in_my_supervisor_chain(emp_id);
END;
$$;

-- 6. can_view_notes continues to piggy-back on can_view_employee_row --------
CREATE OR REPLACE FUNCTION public.can_view_notes(emp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_employee_row(emp_id)
$$;

-- 7. Verification query (safe to run; no side effects)
--    Prints: current user id, position, matrix row, and the raw booleans
--    the policy evaluator will see.
--    Run as the person you want to debug, e.g. via Supabase SQL editor
--    while impersonating that user, or from your app.
COMMENT ON FUNCTION public.can_view_employee_row(uuid) IS
  'Phase 8C: matrix-first employee visibility. L1 admin bypass + Phase 7J self-check always run first.';
