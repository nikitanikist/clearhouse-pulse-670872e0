-- Fix PDR storage RLS: use the object path's first folder (employee id), not employee name.
DROP POLICY IF EXISTS pdr_storage_select ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_insert ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_update ON storage.objects;
DROP POLICY IF EXISTS pdr_storage_delete ON storage.objects;

CREATE POLICY pdr_storage_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pdr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_view_employee(e.position)
  )
);

CREATE POLICY pdr_storage_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pdr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_view_employee(e.position)
  )
);

CREATE POLICY pdr_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'pdr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_view_employee(e.position)
  )
)
WITH CHECK (
  bucket_id = 'pdr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_view_employee(e.position)
  )
);

CREATE POLICY pdr_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pdr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_view_employee(e.position)
  )
);