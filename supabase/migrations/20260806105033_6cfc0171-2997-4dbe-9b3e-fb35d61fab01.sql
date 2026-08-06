CREATE TABLE public.salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  annual_salary numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_history TO authenticated;
GRANT ALL ON public.salary_history TO service_role;

CREATE INDEX salary_history_employee_year_idx ON public.salary_history (employee_id, year DESC);

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_history_select ON public.salary_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = salary_history.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY salary_history_insert ON public.salary_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = salary_history.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY salary_history_update ON public.salary_history FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = salary_history.employee_id AND public.can_view_employee(e.position)))
WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = salary_history.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY salary_history_delete ON public.salary_history FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = salary_history.employee_id AND public.can_view_employee(e.position)));

DROP TRIGGER IF EXISTS trg_salary_updated ON public.salary_history;
CREATE TRIGGER trg_salary_updated BEFORE UPDATE ON public.salary_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();