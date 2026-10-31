-- Dynamic Interpersonal Skill Areas.
--
-- Bryon's Oct 29 note: "skill and assessment lists will be made dynamic via
-- the Settings tab so new categories can be added in the future." This
-- migration moves the hardcoded 10-item list into a real lookup table so
-- admins can add / rename / deactivate categories without a code change.
--
-- Existing rows in public.employee_interpersonal keep their skill_area
-- values; the column type is relaxed from the enum to text so the lookup
-- table can grow freely. The old interpersonal_area enum is left in place
-- (it is still referenced by the TypeScript generated types), unused.

-- 1. Lookup table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interpersonal_skill_areas (
  name        text PRIMARY KEY,
  sort_order  int  NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.interpersonal_skill_areas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.interpersonal_skill_areas TO authenticated;
GRANT ALL ON public.interpersonal_skill_areas TO service_role;

ALTER TABLE public.interpersonal_skill_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_areas_select ON public.interpersonal_skill_areas;
CREATE POLICY skill_areas_select
  ON public.interpersonal_skill_areas FOR SELECT TO authenticated USING (true);

-- Writes: L1 admin OR anyone with action:manage_lookups
DROP POLICY IF EXISTS skill_areas_write ON public.interpersonal_skill_areas;
CREATE POLICY skill_areas_write
  ON public.interpersonal_skill_areas FOR ALL TO authenticated
  USING (
    public.current_security_level() = 1
    OR EXISTS (
      SELECT 1 FROM public.position_permissions pp
      WHERE pp.position_name = public.current_user_position()
        AND pp.resource_key = 'action:manage_lookups'
        AND pp.can_view = true
    )
  )
  WITH CHECK (
    public.current_security_level() = 1
    OR EXISTS (
      SELECT 1 FROM public.position_permissions pp
      WHERE pp.position_name = public.current_user_position()
        AND pp.resource_key = 'action:manage_lookups'
        AND pp.can_view = true
    )
  );

DROP TRIGGER IF EXISTS skill_areas_touch ON public.interpersonal_skill_areas;
CREATE TRIGGER skill_areas_touch
  BEFORE UPDATE ON public.interpersonal_skill_areas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Seed with the current hardcoded list --------------------------------
INSERT INTO public.interpersonal_skill_areas (name, sort_order) VALUES
  ('Client Communication',               10),
  ('Team Collaboration',                 20),
  ('Adaptability',                       30),
  ('Problem-Solving',                    40),
  ('Initiative',                         50),
  ('Commitment to Firm Values',          60),
  ('Dependability During Peak Seasons',  70),
  ('Support for Team Members',           80),
  ('Contributions to Firm Culture',      90),
  ('Business Development',              100)
ON CONFLICT (name) DO NOTHING;

-- 3. Relax employee_interpersonal.skill_area from enum to text -----------
-- Existing rows survive via the straight ::text cast. The enum type stays
-- in the schema so the generated supabase types.ts does not need rewriting.
ALTER TABLE public.employee_interpersonal
  ALTER COLUMN skill_area TYPE text USING skill_area::text;

-- 4. Verification --------------------------------------------------------
-- Returns 1 row with the seed count. 10 means a clean install; a higher
-- number means someone already added categories through the UI, which is
-- also fine.
COMMENT ON TABLE public.interpersonal_skill_areas IS
  'Admin-editable list of Interpersonal Skills & Firm Fit categories. Replaces the hardcoded array in InterpersonalSkills.tsx.';
