CREATE TABLE public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.departments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY departments_insert ON public.departments FOR INSERT TO authenticated WITH CHECK (public.current_security_level() = 1);
CREATE POLICY departments_update ON public.departments FOR UPDATE TO authenticated USING (public.current_security_level() = 1) WITH CHECK (public.current_security_level() = 1);
CREATE POLICY departments_delete ON public.departments FOR DELETE TO authenticated USING (public.current_security_level() = 1);

CREATE TABLE public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  visibility_tier smallint not null check (visibility_tier between 1 and 5),
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.positions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY positions_select ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY positions_insert ON public.positions FOR INSERT TO authenticated WITH CHECK (public.current_security_level() = 1);
CREATE POLICY positions_update ON public.positions FOR UPDATE TO authenticated USING (public.current_security_level() = 1) WITH CHECK (public.current_security_level() = 1);
CREATE POLICY positions_delete ON public.positions FOR DELETE TO authenticated USING (public.current_security_level() = 1);

INSERT INTO public.departments (name) VALUES ('Assurance'),('Tax'),('Advisory'),('Operations') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.positions (name, visibility_tier) VALUES
  ('Partner',1),('Manager',2),('Senior Associate',3),('Intermediate',4),('Associate',4),('Operations',5)
ON CONFLICT (name) DO NOTHING;

DROP POLICY IF EXISTS employees_select ON public.employees;
DROP POLICY IF EXISTS employees_insert ON public.employees;
DROP POLICY IF EXISTS employees_update ON public.employees;
DROP POLICY IF EXISTS comp_select ON public.employee_core_competencies;
DROP POLICY IF EXISTS comp_insert ON public.employee_core_competencies;
DROP POLICY IF EXISTS comp_update ON public.employee_core_competencies;
DROP POLICY IF EXISTS devplan_select ON public.employee_dev_plan_rows;
DROP POLICY IF EXISTS devplan_insert ON public.employee_dev_plan_rows;
DROP POLICY IF EXISTS devplan_delete ON public.employee_dev_plan_rows;
DROP POLICY IF EXISTS interp_select ON public.employee_interpersonal;
DROP POLICY IF EXISTS interp_insert ON public.employee_interpersonal;
DROP POLICY IF EXISTS interp_update ON public.employee_interpersonal;
DROP POLICY IF EXISTS interp_delete ON public.employee_interpersonal;
DROP POLICY IF EXISTS notes_select ON public.management_notes;
DROP POLICY IF EXISTS notes_insert ON public.management_notes;
DROP POLICY IF EXISTS notes_update ON public.management_notes;
DROP POLICY IF EXISTS notes_delete ON public.management_notes;
DROP POLICY IF EXISTS pdr_select ON public.pdr_documents;
DROP POLICY IF EXISTS pdr_insert ON public.pdr_documents;
DROP POLICY IF EXISTS pdr_delete ON public.pdr_documents;
DROP POLICY IF EXISTS pdr_storage_select ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_insert ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_update ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_delete ON storage.objects;

ALTER TABLE public.employees ALTER COLUMN department TYPE text USING department::text;
ALTER TABLE public.employees ALTER COLUMN position TYPE text USING position::text;

DROP FUNCTION IF EXISTS public.can_view_employee(public.employee_position) CASCADE;

CREATE OR REPLACE FUNCTION public.can_view_employee(p text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.current_security_level()
    WHEN 1 THEN true
    WHEN 5 THEN (SELECT visibility_tier FROM public.positions WHERE name = p) = 5
    ELSE (SELECT visibility_tier FROM public.positions WHERE name = p) BETWEEN public.current_security_level() AND 4
  END
$$;
GRANT EXECUTE ON FUNCTION public.can_view_employee(text) TO authenticated;

CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated USING (public.can_view_employee("position"));
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated WITH CHECK (public.can_view_employee("position"));
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated USING (public.can_view_employee("position")) WITH CHECK (public.can_view_employee("position"));

CREATE POLICY comp_select ON public.employee_core_competencies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY comp_insert ON public.employee_core_competencies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY comp_update ON public.employee_core_competencies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position"))) WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));

CREATE POLICY devplan_select ON public.employee_dev_plan_rows FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY devplan_insert ON public.employee_dev_plan_rows FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY devplan_delete ON public.employee_dev_plan_rows FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));

CREATE POLICY interp_select ON public.employee_interpersonal FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY interp_insert ON public.employee_interpersonal FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY interp_update ON public.employee_interpersonal FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position"))) WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY interp_delete ON public.employee_interpersonal FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));

CREATE POLICY notes_select ON public.management_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY notes_insert ON public.management_notes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY notes_update ON public.management_notes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position"))) WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY notes_delete ON public.management_notes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));

CREATE POLICY pdr_select ON public.pdr_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY pdr_insert ON public.pdr_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));
CREATE POLICY pdr_delete ON public.pdr_documents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.can_view_employee(e."position")));

CREATE POLICY pdr_storage_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pdr-documents' AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id::text = (storage.foldername(name))[1] AND public.can_view_employee(e."position")));
CREATE POLICY pdr_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdr-documents' AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id::text = (storage.foldername(name))[1] AND public.can_view_employee(e."position")));
CREATE POLICY pdr_storage_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pdr-documents' AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id::text = (storage.foldername(name))[1] AND public.can_view_employee(e."position"))) WITH CHECK (bucket_id = 'pdr-documents' AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id::text = (storage.foldername(name))[1] AND public.can_view_employee(e."position")));
CREATE POLICY pdr_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pdr-documents' AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id::text = (storage.foldername(name))[1] AND public.can_view_employee(e."position")));
