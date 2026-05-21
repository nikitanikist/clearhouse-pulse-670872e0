-- Enums
create type public.employee_position as enum
  ('Partner','Manager','Senior Associate','Intermediate','Associate','Operations');
create type public.employee_department as enum
  ('Assurance','Tax','Advisory','Operations');
create type public.employee_location as enum ('Canada','India');
create type public.competency_rating as enum ('E','G','M','NI');
create type public.potential_rating as enum
  ('Well Placed','Ready Now','Ready Soon','Ready Later');
create type public.core_competency as enum
  ('Thought','Results','Expertise','People','Self');
create type public.interpersonal_area as enum (
  'Client Communication','Team Collaboration','Adaptability','Problem-Solving',
  'Initiative','Commitment to Firm Values','Dependability During Peak Seasons',
  'Support for Team Members','Contributions to Firm Culture'
);

-- profiles
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  security_level smallint not null check (security_level between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_own_select" on public.profiles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, security_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'security_level')::smallint, 5)
  )
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_security_level()
returns smallint language sql stable security definer set search_path = public as $$
  select security_level from public.profiles where user_id = auth.uid()
$$;

create or replace function public.can_view_employee(p public.employee_position)
returns boolean language sql stable set search_path = public as $$
  select case public.current_security_level()
    when 1 then true
    when 2 then p in ('Manager','Senior Associate','Intermediate','Associate')
    when 3 then p in ('Senior Associate','Intermediate','Associate')
    when 4 then p in ('Intermediate','Associate')
    when 5 then p = 'Operations'
    else false
  end
$$;

-- employees
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position public.employee_position not null,
  department public.employee_department not null,
  location public.employee_location not null,
  tenure_with_firm text not null default '',
  tenure_in_role text not null default '',
  supervisor text not null default '',
  email text not null unique,
  phone text not null default '',
  current_year_rating numeric(3,2) not null default 0,
  current_year_rating_code public.competency_rating not null default 'M',
  potential_rating public.potential_rating not null default 'Well Placed',
  bff_summary text not null default '',
  performance_what_went_well text not null default '',
  performance_what_could_go_better text not null default '',
  performance_summary text not null default '',
  career_aspirations_summary text not null default '',
  dev_plan_summary text not null default '',
  growth_rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.employees enable row level security;
create policy "employees_select" on public.employees
  for select to authenticated using (public.can_view_employee(position));

create table public.employee_core_competencies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  competency_name public.core_competency not null,
  rating_code public.competency_rating not null,
  commentary text not null default '',
  unique (employee_id, competency_name)
);
alter table public.employee_core_competencies enable row level security;
create policy "comp_select" on public.employee_core_competencies
  for select to authenticated using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));

create table public.employee_dev_plan_rows (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  objective text not null,
  activities text not null default '',
  support_resources text not null default '',
  target_date date,
  sort_order int not null default 0
);
alter table public.employee_dev_plan_rows enable row level security;
create policy "devplan_select" on public.employee_dev_plan_rows
  for select to authenticated using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));

create table public.employee_interpersonal (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  skill_area public.interpersonal_area not null,
  assessment_text text not null default '',
  unique (employee_id, skill_area)
);
alter table public.employee_interpersonal enable row level security;
create policy "interp_select" on public.employee_interpersonal
  for select to authenticated using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));

create table public.management_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  comment_text text not null,
  comment_by text not null default '',
  created_at timestamptz not null default now()
);
alter table public.management_notes enable row level security;
create policy "notes_select" on public.management_notes
  for select to authenticated using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));
create policy "notes_insert" on public.management_notes
  for insert to authenticated with check (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));

create table public.pdr_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
alter table public.pdr_documents enable row level security;
create policy "pdr_select" on public.pdr_documents
  for select to authenticated using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.can_view_employee(e.position)
  ));

insert into storage.buckets (id, name, public)
values ('pdr-documents','pdr-documents', false)
on conflict (id) do nothing;

create policy "pdr_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pdr-documents'
    and exists (
      select 1 from public.employees e
      where e.id::text = split_part(name, '/', 1)
        and public.can_view_employee(e.position)
    )
  );