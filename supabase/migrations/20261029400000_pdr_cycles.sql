-- Phase 9A — PDR Cycle data model (Mid-Year / Year-End reviews).
--
-- Each (employee, year, half) pair owns ONE pdr_cycles row that moves through
-- three statuses:
--
--   open      -> employee + manager both edit their own sections (auto-save)
--   shutdown  -> manager-only window; employee is temporarily blocked from
--                viewing the form. Set by someone with action:pdr_lock.
--   archived  -> read-only forever; visibility widens per Bryon's spec
--                (employee + their manager + any manager in the same
--                department + Partners + HR + Operations & HR Coordinator).
--                Set by someone with action:pdr_archive.
--
-- The actual form content is stored as a single jsonb blob matching the
-- template Bryon shared. Storing it as a blob (rather than one row per
-- field) keeps the form rendering simple; we only need relational columns
-- for the lifecycle (status, timestamps, year, half).

-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.pdr_cycle_status AS ENUM ('open','shutdown','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pdr_cycle_half AS ENUM ('midyear','yearend');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Cycle table
CREATE TABLE IF NOT EXISTS public.pdr_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  half public.pdr_cycle_half NOT NULL,
  status public.pdr_cycle_status NOT NULL DEFAULT 'open',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewer_name_snapshot text, -- captured when cycle is opened
  opened_at   timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year, half)
);

CREATE INDEX IF NOT EXISTS pdr_cycles_employee_idx
  ON public.pdr_cycles(employee_id, year DESC, half);

-- 3. Admin-configurable shutdown windows (one row per year+half)
CREATE TABLE IF NOT EXISTS public.pdr_cycle_schedule (
  year int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  half public.pdr_cycle_half NOT NULL,
  shutdown_start date,
  shutdown_end   date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, half),
  CHECK (shutdown_start IS NULL OR shutdown_end IS NULL OR shutdown_start <= shutdown_end)
);

-- 4. updated_at trigger (reuse existing helper)
DROP TRIGGER IF EXISTS pdr_cycles_touch ON public.pdr_cycles;
CREATE TRIGGER pdr_cycles_touch
  BEFORE UPDATE ON public.pdr_cycles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS pdr_cycle_schedule_touch ON public.pdr_cycle_schedule;
CREATE TRIGGER pdr_cycle_schedule_touch
  BEFORE UPDATE ON public.pdr_cycle_schedule
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Helper: broadened visibility for ARCHIVED cycles --------------------
-- Returns true when the current user is allowed to see an archived PDR of
-- the given employee. Rules (Bryon's spec):
--   - L1 admin bypass
--   - The employee themselves (self)
--   - Their manager (anyone in whose supervisor chain the employee sits)
--   - Any Manager-positioned user in the SAME department as the employee
--   - Positions in: Partner / HR / Operations & HR Coordinator
CREATE OR REPLACE FUNCTION public.can_view_archived_pdr(emp_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_me  public.employees%ROWTYPE;
  v_target public.employees%ROWTYPE;
  v_pos text;
BEGIN
  IF public.current_security_level() = 1 THEN RETURN true; END IF;

  v_uid := public.current_user_employee_id();
  IF v_uid IS NOT NULL AND emp_id = v_uid THEN RETURN true; END IF;
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_me FROM public.employees WHERE id = v_uid;
  SELECT * INTO v_target FROM public.employees WHERE id = emp_id;
  IF NOT FOUND THEN RETURN false; END IF;

  v_pos := public.current_user_position();

  -- Partners / HR / Operations & HR Coordinator see every archived PDR
  IF lower(coalesce(v_pos,'')) IN ('partner','hr','operations & hr coordinator','admin','administrator') THEN
    RETURN true;
  END IF;

  -- Supervisor chain
  IF public.is_in_my_supervisor_chain(emp_id) THEN
    RETURN true;
  END IF;

  -- Manager in the SAME department as the target
  IF (lower(coalesce(v_pos,'')) LIKE 'manager%' OR lower(coalesce(v_pos,'')) LIKE '%manager')
     AND v_me.department IS NOT NULL
     AND v_target.department IS NOT NULL
     AND lower(trim(v_me.department)) = lower(trim(v_target.department)) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 6. Combined visibility rule for pdr_cycles -----------------------------
-- Open    -> can_view_employee_row + employee themselves always
-- Shutdown-> can_view_employee_row BUT exclude the employee themselves
-- Archived-> can_view_archived_pdr
CREATE OR REPLACE FUNCTION public.can_see_pdr_cycle(
  emp_id uuid, cycle_status public.pdr_cycle_status
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF public.current_security_level() = 1 THEN RETURN true; END IF;

  IF cycle_status = 'archived' THEN
    RETURN public.can_view_archived_pdr(emp_id);
  END IF;

  IF cycle_status = 'shutdown' THEN
    -- Employee themselves is BLOCKED during shutdown
    v_uid := public.current_user_employee_id();
    IF v_uid IS NOT NULL AND emp_id = v_uid THEN RETURN false; END IF;
    RETURN public.can_view_employee_row(emp_id);
  END IF;

  -- Open: standard rules (which include the self-check)
  RETURN public.can_view_employee_row(emp_id);
END;
$$;

-- 7. RLS -----------------------------------------------------------------
ALTER TABLE public.pdr_cycles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdr_cycle_schedule  ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_cycles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_cycle_schedule TO authenticated;
GRANT ALL ON public.pdr_cycles         TO service_role;
GRANT ALL ON public.pdr_cycle_schedule TO service_role;

-- SELECT: delegated to can_see_pdr_cycle
DROP POLICY IF EXISTS pdr_cycles_select ON public.pdr_cycles;
CREATE POLICY pdr_cycles_select
  ON public.pdr_cycles
  FOR SELECT TO authenticated
  USING (public.can_see_pdr_cycle(employee_id, status));

-- INSERT: anyone who can edit this employee's PDR (will be refined by the
-- client; for now, require can_view_employee_row AND one of: L1 admin,
-- supervisor-chain ancestor, or the employee themselves).
DROP POLICY IF EXISTS pdr_cycles_insert ON public.pdr_cycles;
CREATE POLICY pdr_cycles_insert
  ON public.pdr_cycles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_security_level() = 1
    OR employee_id = public.current_user_employee_id()
    OR public.is_in_my_supervisor_chain(employee_id)
  );

-- UPDATE: same rule as INSERT, but archived cycles are LOCKED.
-- The L1 admin bypass still works (so admins can unarchive if needed).
DROP POLICY IF EXISTS pdr_cycles_update ON public.pdr_cycles;
CREATE POLICY pdr_cycles_update
  ON public.pdr_cycles
  FOR UPDATE TO authenticated
  USING (
    public.current_security_level() = 1
    OR (
      status <> 'archived'
      AND (
        employee_id = public.current_user_employee_id()
        OR public.is_in_my_supervisor_chain(employee_id)
      )
    )
  )
  WITH CHECK (
    public.current_security_level() = 1
    OR (
      status <> 'archived'
      AND (
        employee_id = public.current_user_employee_id()
        OR public.is_in_my_supervisor_chain(employee_id)
      )
    )
  );

-- DELETE: L1 admin only (archived PDRs are historical records)
DROP POLICY IF EXISTS pdr_cycles_delete ON public.pdr_cycles;
CREATE POLICY pdr_cycles_delete
  ON public.pdr_cycles
  FOR DELETE TO authenticated
  USING (public.current_security_level() = 1);

-- pdr_cycle_schedule: everyone reads (so clients know shutdown dates);
-- only L1 admin writes.
DROP POLICY IF EXISTS pdr_schedule_select ON public.pdr_cycle_schedule;
CREATE POLICY pdr_schedule_select
  ON public.pdr_cycle_schedule FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pdr_schedule_write ON public.pdr_cycle_schedule;
CREATE POLICY pdr_schedule_write
  ON public.pdr_cycle_schedule FOR ALL TO authenticated
  USING (public.current_security_level() = 1)
  WITH CHECK (public.current_security_level() = 1);
