-- ============ Phase 7H: L1 admin bypass on all Phase 7B policies ============

-- employees --------------------------------------------------------------
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(id));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1 OR public.current_user_can('can_add_employee'));

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(id))
  WITH CHECK (public.current_security_level() = 1 OR public.can_view_employee_row(id));

DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated
  USING (public.current_security_level() = 1 OR public.current_user_can('can_add_employee'));

-- employee_core_competencies ---------------------------------------------
DROP POLICY IF EXISTS comp_select ON public.employee_core_competencies;
CREATE POLICY comp_select ON public.employee_core_competencies FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS comp_insert ON public.employee_core_competencies;
CREATE POLICY comp_insert ON public.employee_core_competencies FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance')));

DROP POLICY IF EXISTS comp_update ON public.employee_core_competencies;
CREATE POLICY comp_update ON public.employee_core_competencies FOR UPDATE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance')))
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance')));

DROP POLICY IF EXISTS comp_delete ON public.employee_core_competencies;
CREATE POLICY comp_delete ON public.employee_core_competencies FOR DELETE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_performance')));

-- employee_dev_plan_rows --------------------------------------------------
DROP POLICY IF EXISTS devplan_select ON public.employee_dev_plan_rows;
CREATE POLICY devplan_select ON public.employee_dev_plan_rows FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS devplan_insert ON public.employee_dev_plan_rows;
CREATE POLICY devplan_insert ON public.employee_dev_plan_rows FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_growth')));

DROP POLICY IF EXISTS devplan_delete ON public.employee_dev_plan_rows;
CREATE POLICY devplan_delete ON public.employee_dev_plan_rows FOR DELETE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_growth')));

-- employee_interpersonal ---------------------------------------------------
DROP POLICY IF EXISTS interp_select ON public.employee_interpersonal;
CREATE POLICY interp_select ON public.employee_interpersonal FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS interp_insert ON public.employee_interpersonal;
CREATE POLICY interp_insert ON public.employee_interpersonal FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal')));

DROP POLICY IF EXISTS interp_update ON public.employee_interpersonal;
CREATE POLICY interp_update ON public.employee_interpersonal FOR UPDATE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal')))
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal')));

DROP POLICY IF EXISTS interp_delete ON public.employee_interpersonal;
CREATE POLICY interp_delete ON public.employee_interpersonal FOR DELETE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_employee_row(employee_id) AND public.current_user_can('can_edit_interpersonal')));

-- management_notes ---------------------------------------------------------
DROP POLICY IF EXISTS notes_select ON public.management_notes;
CREATE POLICY notes_select ON public.management_notes FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_notes(employee_id));

DROP POLICY IF EXISTS notes_insert ON public.management_notes;
CREATE POLICY notes_insert ON public.management_notes FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes')));

DROP POLICY IF EXISTS notes_update ON public.management_notes;
CREATE POLICY notes_update ON public.management_notes FOR UPDATE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes')))
  WITH CHECK (public.current_security_level() = 1
    OR (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes')));

DROP POLICY IF EXISTS notes_delete ON public.management_notes;
CREATE POLICY notes_delete ON public.management_notes FOR DELETE TO authenticated
  USING (public.current_security_level() = 1
    OR (public.can_view_notes(employee_id) AND public.current_user_can('can_edit_notes')));

-- pdr_documents ------------------------------------------------------------
DROP POLICY IF EXISTS pdr_select ON public.pdr_documents;
CREATE POLICY pdr_select ON public.pdr_documents FOR SELECT TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id));

DROP POLICY IF EXISTS pdr_insert ON public.pdr_documents;
CREATE POLICY pdr_insert ON public.pdr_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
    AND (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id)));

DROP POLICY IF EXISTS pdr_delete ON public.pdr_documents;
CREATE POLICY pdr_delete ON public.pdr_documents FOR DELETE TO authenticated
  USING (public.current_security_level() = 1 OR public.can_view_employee_row(employee_id));

-- storage.objects (pdr-documents bucket) -----------------------------------
-- NOTE: previous versions compared storage.foldername(e.name) (the employee's
-- name) instead of the object path; corrected to objects.name here.
DROP POLICY IF EXISTS pdr_storage_select ON storage.objects;
CREATE POLICY pdr_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pdr-documents' AND (
    public.current_security_level() = 1
    OR EXISTS (SELECT 1 FROM public.employees e
               WHERE e.id::text = (storage.foldername(objects.name))[1]
                 AND public.can_view_employee(e."position"::text))));

DROP POLICY IF EXISTS pdr_storage_insert ON storage.objects;
CREATE POLICY pdr_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdr-documents' AND (
    public.current_security_level() = 1
    OR EXISTS (SELECT 1 FROM public.employees e
               WHERE e.id::text = (storage.foldername(objects.name))[1]
                 AND public.can_view_employee(e."position"::text))));

DROP POLICY IF EXISTS pdr_storage_update ON storage.objects;
CREATE POLICY pdr_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pdr-documents' AND (
    public.current_security_level() = 1
    OR EXISTS (SELECT 1 FROM public.employees e
               WHERE e.id::text = (storage.foldername(objects.name))[1]
                 AND public.can_view_employee(e."position"::text))))
  WITH CHECK (bucket_id = 'pdr-documents' AND (
    public.current_security_level() = 1
    OR EXISTS (SELECT 1 FROM public.employees e
               WHERE e.id::text = (storage.foldername(objects.name))[1]
                 AND public.can_view_employee(e."position"::text))));

DROP POLICY IF EXISTS pdr_storage_delete ON storage.objects;
CREATE POLICY pdr_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdr-documents' AND (
    public.current_security_level() = 1
    OR EXISTS (SELECT 1 FROM public.employees e
               WHERE e.id::text = (storage.foldername(objects.name))[1]
                 AND public.can_view_employee(e."position"::text))));

-- access_rules -------------------------------------------------------------
DROP POLICY IF EXISTS access_rules_insert ON public.access_rules;
CREATE POLICY access_rules_insert ON public.access_rules FOR INSERT TO authenticated
  WITH CHECK (public.current_security_level() = 1 OR public.current_user_can('can_manage_access_rules'));

DROP POLICY IF EXISTS access_rules_update ON public.access_rules;
CREATE POLICY access_rules_update ON public.access_rules FOR UPDATE TO authenticated
  USING (public.current_security_level() = 1 OR public.current_user_can('can_manage_access_rules'))
  WITH CHECK (public.current_security_level() = 1 OR public.current_user_can('can_manage_access_rules'));

DROP POLICY IF EXISTS access_rules_delete ON public.access_rules;
CREATE POLICY access_rules_delete ON public.access_rules FOR DELETE TO authenticated
  USING (public.current_security_level() = 1 OR public.current_user_can('can_manage_access_rules'));

-- To verify as Sarb (L1) after publish:
--   SELECT public.current_security_level();  -- should return 1
--   SELECT public.current_user_position();   -- may return null or 'Partner'
--   SELECT public.can_view_employee_row(id) FROM public.employees LIMIT 5;  -- all true
