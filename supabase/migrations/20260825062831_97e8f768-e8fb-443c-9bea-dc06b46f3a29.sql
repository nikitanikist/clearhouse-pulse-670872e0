-- 1. Fix "Failed to load users": profiles needs an email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill emails for existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Store email on future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, security_level)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'security_level')::smallint, 5)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END; $$;

-- 3. Employee active/inactive flag
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Hard delete: only L1 admins or positions with the add-employee capability.
-- Child rows (competencies, dev plan, interpersonal, notes, PDRs) cascade automatically.
CREATE POLICY employees_delete ON public.employees
  FOR DELETE TO authenticated
  USING (public.current_security_level() = 1 OR public.current_user_can('can_add_employee'));

-- 4. Lookup active/inactive flags
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;