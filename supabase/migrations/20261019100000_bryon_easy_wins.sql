-- Bryon's Oct 16, 2026 easy-win feedback:
--   1. Add 'Business Development' to interpersonal_area enum
--   2. Rename department 'Bookkeeping' -> 'Accounting'
--   3. Add 'SR&ED' department

-- 1. Business Development as an interpersonal skill area
--    Postgres won't let ADD VALUE run inside an existing transaction
--    alongside other DDL, so this must be the first statement.
ALTER TYPE public.interpersonal_area ADD VALUE IF NOT EXISTS 'Business Development';

-- 2. Rename Bookkeeping -> Accounting (if present); update employee rows
UPDATE public.departments SET name = 'Accounting' WHERE name = 'Bookkeeping';
UPDATE public.employees   SET department = 'Accounting' WHERE department = 'Bookkeeping';

-- 3. SR&ED department
INSERT INTO public.departments (name) VALUES ('SR&ED')
ON CONFLICT (name) DO NOTHING;
