-- Phase 7K — Switch current_user_* helpers from auth.jwt() to auth.uid()
--
-- Problem: all five current_user_* helpers used `auth.jwt() ->> 'email'` to
-- find the caller's employee record. In some Supabase sessions this claim
-- is NULL (particularly for users whose auth row was inserted via SQL
-- rather than through a sign-up flow). When it's NULL every helper returns
-- NULL, Phase 7J's self-check never fires, and the position-based rules
-- deny the user access to their own record — resulting in "No employee
-- record linked to your login" even though the record exists.
--
-- Fix: look the caller's email up directly from auth.users via auth.uid(),
-- which is always set for an authenticated session. The functions keep
-- the same signature and return type; existing GRANT EXECUTE on all five
-- stays valid.

CREATE OR REPLACE FUNCTION public.current_user_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_position()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.position
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.department
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_location()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.location::text
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_name()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.name
  FROM public.employees e
  JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- Also fix the two L6 edge-case checks in employees SELECT policy and
-- can_view_employee() (old helper) which still use auth.jwt() ->> 'email'.
-- Rewrite them to use auth.users lookup too.

CREATE OR REPLACE FUNCTION public.can_view_employee(p text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.current_security_level()
    WHEN 1 THEN true
    WHEN 6 THEN EXISTS (
      SELECT 1 FROM public.employees e
      JOIN auth.users u ON lower(trim(u.email)) = lower(trim(e.email))
      WHERE e.position = p
        AND u.id = auth.uid()
    )
    WHEN 5 THEN (SELECT visibility_tier FROM public.positions WHERE name = p) = 5
    ELSE (SELECT visibility_tier FROM public.positions WHERE name = p) BETWEEN public.current_security_level() AND 4
  END
$$;

-- Rewrite the employees SELECT policy to use auth.users lookup too,
-- replacing its L6 branch that still uses auth.jwt() ->> 'email'.
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
FOR SELECT TO authenticated
USING (
  public.current_security_level() = 1
  OR (public.current_security_level() = 6 AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(trim(u.email)) = lower(trim(employees.email))
  ))
  OR (public.current_security_level() <> 6 AND public.can_view_employee_row(id))
);
