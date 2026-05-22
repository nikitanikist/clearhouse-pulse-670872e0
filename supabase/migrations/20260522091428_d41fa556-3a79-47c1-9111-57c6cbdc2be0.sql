CREATE POLICY "pdr_delete" ON public.pdr_documents
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = pdr_documents.employee_id AND public.can_view_employee(e.position)));

CREATE POLICY "notes_delete" ON public.management_notes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = management_notes.employee_id AND public.can_view_employee(e.position)));