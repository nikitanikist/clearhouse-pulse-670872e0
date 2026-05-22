CREATE POLICY interp_insert ON public.employee_interpersonal
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_interpersonal.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY interp_update ON public.employee_interpersonal
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_interpersonal.employee_id AND public.can_view_employee(e.position)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_interpersonal.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY interp_delete ON public.employee_interpersonal
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_interpersonal.employee_id AND public.can_view_employee(e.position)));