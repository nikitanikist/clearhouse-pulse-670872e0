-- Phase 2: Data integrity + rating model cleanup

-- 1. Make rating nullable so "unrated" is distinct from 0
ALTER TABLE public.employees ALTER COLUMN current_year_rating DROP DEFAULT;
ALTER TABLE public.employees ALTER COLUMN current_year_rating DROP NOT NULL;

-- 2. Delete the test record
DELETE FROM public.employees WHERE name = 'ZZ TEST DELETE ME';

-- 3. Repair UTF-8 mojibake in any text fields
UPDATE public.employees SET
  bff_summary = replace(replace(replace(replace(replace(replace(bff_summary,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  performance_summary = replace(replace(replace(replace(replace(replace(performance_summary,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  performance_what_went_well = replace(replace(replace(replace(replace(replace(performance_what_went_well,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  performance_what_could_go_better = replace(replace(replace(replace(replace(replace(performance_what_could_go_better,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  career_aspirations_summary = replace(replace(replace(replace(replace(replace(career_aspirations_summary,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  dev_plan_summary = replace(replace(replace(replace(replace(replace(dev_plan_summary,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò',''''),
  growth_rationale = replace(replace(replace(replace(replace(replace(growth_rationale,
    '‚Äî','—'),'‚Äì','–'),'‚Äú','"'),'‚Äù','"'),'‚Äô',''''),'‚Äò','''');

-- 4. Set rating to NULL for any employee whose rating is exactly 0
-- (these are records that were never actually rated)
UPDATE public.employees SET current_year_rating = NULL WHERE current_year_rating = 0;
