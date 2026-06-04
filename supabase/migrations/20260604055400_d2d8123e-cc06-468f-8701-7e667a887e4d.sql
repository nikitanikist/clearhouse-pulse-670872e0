ALTER TABLE public.employee_core_competencies ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.employee_interpersonal ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.management_notes ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS performance_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comp_updated ON public.employee_core_competencies;
CREATE TRIGGER trg_comp_updated BEFORE UPDATE ON public.employee_core_competencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_interp_updated ON public.employee_interpersonal;
CREATE TRIGGER trg_interp_updated BEFORE UPDATE ON public.employee_interpersonal
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated ON public.management_notes;
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.management_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();