create policy "pdr_insert"
on public.pdr_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.employees e
    where e.id = pdr_documents.employee_id
      and public.can_view_employee(e.position)
  )
);

create policy "employees_update"
on public.employees
for update
to authenticated
using (public.can_view_employee(position))
with check (public.can_view_employee(position));

create policy "comp_insert"
on public.employee_core_competencies
for insert
to authenticated
with check (
  exists (
    select 1 from public.employees e
    where e.id = employee_core_competencies.employee_id
      and public.can_view_employee(e.position)
  )
);

create policy "comp_update"
on public.employee_core_competencies
for update
to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = employee_core_competencies.employee_id
      and public.can_view_employee(e.position)
  )
)
with check (
  exists (
    select 1 from public.employees e
    where e.id = employee_core_competencies.employee_id
      and public.can_view_employee(e.position)
  )
);

create policy "devplan_insert"
on public.employee_dev_plan_rows
for insert
to authenticated
with check (
  exists (
    select 1 from public.employees e
    where e.id = employee_dev_plan_rows.employee_id
      and public.can_view_employee(e.position)
  )
);

create policy "devplan_delete"
on public.employee_dev_plan_rows
for delete
to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = employee_dev_plan_rows.employee_id
      and public.can_view_employee(e.position)
  )
);

create policy "pdr_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pdr-documents'
  and exists (
    select 1 from public.employees e
    where e.id::text = (storage.foldername(name))[1]
      and public.can_view_employee(e.position)
  )
);

create policy "pdr_storage_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pdr-documents'
  and exists (
    select 1 from public.employees e
    where e.id::text = (storage.foldername(name))[1]
      and public.can_view_employee(e.position)
  )
);

create policy "pdr_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pdr-documents'
  and exists (
    select 1 from public.employees e
    where e.id::text = (storage.foldername(name))[1]
      and public.can_view_employee(e.position)
  )
);