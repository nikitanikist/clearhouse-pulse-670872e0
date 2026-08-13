ALTER TABLE public.profiles DROP CONSTRAINT profiles_security_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_security_level_check CHECK (security_level >= 1 AND security_level <= 6);

CREATE OR REPLACE FUNCTION public.can_view_employee(p text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE public.current_security_level()
    WHEN 1 THEN true
    WHEN 6 THEN EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e."position" = p
        AND lower(e.email) = lower(auth.jwt() ->> 'email')
    )
    WHEN 5 THEN (SELECT visibility_tier FROM public.positions WHERE name = p) = 5
    ELSE (SELECT visibility_tier FROM public.positions WHERE name = p) BETWEEN public.current_security_level() AND 4
  END
$function$;

DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
FOR SELECT TO authenticated
USING (
  (public.current_security_level() = 6 AND lower(email) = lower(auth.jwt() ->> 'email'))
  OR (public.current_security_level() <> 6 AND public.can_view_employee("position"))
);