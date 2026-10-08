-- Phase 7L — Supervisor-chain access model + multi-manager support
--
-- Replaces the per-position Access Rules model with a simpler
-- supervisor-chain rule for employee visibility:
--
--   1. Level-1 admins (Sarb, Emily) always see everyone (bypass).
--   2. Phase 7J self-check: every user always sees their own record.
--   3. Users with no linked employee → no access (admins handled above).
--   4. Top-level employees (no supervisor AND no co_supervisor) → see all.
--   5. Managers see every employee in their supervisor chain below them —
--      direct AND indirect reports, following both the supervisor and the
--      co_supervisor field.
--
-- Access Rules (per-position config) still exists in the DB and the
-- Settings UI, but is no longer the primary source of truth. The
-- supervisor-chain rule covers virtually every case; Access Rules remain
-- available as an override layer for future edge cases.
--
-- Also:
--   - Adds employees.co_supervisor text column for the "two managers" case
--     (Aditya, Ankit, Mansi, Ravindra all report to both Avnish Kumar and
--     Mohit Sharma). Backfills those 4 rows.
--   - Renames "Halleluyah/Ebun Ojo" to "Ebun Ojo" so her 5 existing
--     reports' supervisor fields resolve cleanly.
--   - can_view_notes now mirrors can_view_employee_row (same rule).

-- 1. Rename Ebun
UPDATE public.employees
SET name = 'Ebun Ojo'
WHERE name = 'Halleluyah/Ebun Ojo';

-- 2. Add co_supervisor column
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS co_supervisor text;

-- 3. Backfill the 4 "Avnish Kumar and Mohit Sharma" cases
UPDATE public.employees
SET supervisor    = 'Avnish Kumar',
    co_supervisor = 'Mohit Sharma'
WHERE trim(supervisor) IN (
  'Avnish Kumar and Mohit Sharma',
  'Mohit Sharma and Avnish Kumar'
);

-- 4. Phase 7L: supervisor-chain can_view_employee_row
CREATE OR REPLACE FUNCTION public.can_view_employee_row(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
BEGIN
  -- 1. L1 admin bypass
  IF public.current_security_level() = 1 THEN
    RETURN true;
  END IF;

  v_uid := public.current_user_employee_id();

  -- 2. Self-check (Phase 7J)
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN
    RETURN true;
  END IF;

  -- 3. No linked employee → no access (admin handled above)
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 4. Top-level: no supervisor AND no co_supervisor → see everyone
  IF (v_me.supervisor IS NULL OR trim(v_me.supervisor) = '')
     AND (v_me.co_supervisor IS NULL OR trim(v_me.co_supervisor) = '') THEN
    RETURN true;
  END IF;

  -- 5. Supervisor-chain walk: am I above emp_id in the hierarchy?
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

-- 5. Notes use the same rule
CREATE OR REPLACE FUNCTION public.can_view_notes(emp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_employee_row(emp_id)
$$;
