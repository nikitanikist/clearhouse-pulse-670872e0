-- Growth & Impact journal (Bryon Oct 16 2026 ADD list).
-- A per-employee journal with Date, Category, Notes. The employee owns
-- their entries; managers who can already view the employee can read them.

-- 1. Category enum
DO $$ BEGIN
  CREATE TYPE public.growth_impact_category AS ENUM (
    'My Impact',
    'My Growth',
    'Feedback and Recognition',
    'What''s Next'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.growth_impact_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  category public.growth_impact_category NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_impact_entries_employee_idx
  ON public.growth_impact_entries(employee_id, entry_date DESC);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS growth_impact_touch ON public.growth_impact_entries;
CREATE TRIGGER growth_impact_touch
  BEFORE UPDATE ON public.growth_impact_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. RLS
ALTER TABLE public.growth_impact_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_impact_entries TO authenticated;
GRANT ALL ON public.growth_impact_entries TO service_role;

-- READ: anyone who can view the employee row can read their journal
DROP POLICY IF EXISTS growth_impact_select ON public.growth_impact_entries;
CREATE POLICY growth_impact_select
  ON public.growth_impact_entries
  FOR SELECT TO authenticated
  USING (public.can_view_employee_row(employee_id));

-- WRITE: only the employee themselves can add/edit/delete their own entries
DROP POLICY IF EXISTS growth_impact_insert ON public.growth_impact_entries;
CREATE POLICY growth_impact_insert
  ON public.growth_impact_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.current_user_employee_id()
    OR public.current_security_level() = 1
  );

DROP POLICY IF EXISTS growth_impact_update ON public.growth_impact_entries;
CREATE POLICY growth_impact_update
  ON public.growth_impact_entries
  FOR UPDATE TO authenticated
  USING (
    employee_id = public.current_user_employee_id()
    OR public.current_security_level() = 1
  )
  WITH CHECK (
    employee_id = public.current_user_employee_id()
    OR public.current_security_level() = 1
  );

DROP POLICY IF EXISTS growth_impact_delete ON public.growth_impact_entries;
CREATE POLICY growth_impact_delete
  ON public.growth_impact_entries
  FOR DELETE TO authenticated
  USING (
    employee_id = public.current_user_employee_id()
    OR public.current_security_level() = 1
  );
