-- Phase 10B — Per-user permission overrides on top of the position matrix.
--
-- Position_permissions sets the DEFAULT for everyone with that position.
-- user_permission_overrides lets an admin pin a specific person's (user_id,
-- resource_key) cell to something different without touching the whole
-- position row. If a user has NO override for a resource they fall back
-- to the position default (which, if also absent, falls back to Phase 7L
-- supervisor-chain).

-- 1. Table ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  user_id      uuid NOT NULL,
  resource_key text NOT NULL REFERENCES public.permission_resources(key) ON DELETE CASCADE,
  can_view     boolean NOT NULL,
  can_edit     boolean NOT NULL DEFAULT false,
  scope        text NOT NULL
               CHECK (scope IN ('all','own_department','own_team','self','linked_manager_only')),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid,
  PRIMARY KEY (user_id, resource_key)
);
CREATE INDEX IF NOT EXISTS user_permission_overrides_user_idx
  ON public.user_permission_overrides(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone may read EVERY override row. The client needs to know what
-- restrictions apply to it, and showing other people's overrides is
-- consistent with the Position matrix being world-readable. If this ever
-- becomes sensitive, tighten here.
DROP POLICY IF EXISTS upo_select ON public.user_permission_overrides;
CREATE POLICY upo_select
  ON public.user_permission_overrides
  FOR SELECT TO authenticated USING (true);

-- Only L1 admins may write overrides.
DROP POLICY IF EXISTS upo_write ON public.user_permission_overrides;
CREATE POLICY upo_write
  ON public.user_permission_overrides
  FOR ALL TO authenticated
  USING (public.current_security_level() = 1)
  WITH CHECK (public.current_security_level() = 1);

DROP TRIGGER IF EXISTS upo_touch ON public.user_permission_overrides;
CREATE TRIGGER upo_touch
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Make current_user_matrix prefer the override --------------------------
-- Returns the EFFECTIVE (can_view, scope) for the signed-in user and the
-- given resource. Override wins over position; absence of both returns no
-- row so callers can fall back to Phase 7L supervisor-chain.
CREATE OR REPLACE FUNCTION public.current_user_matrix(resource text)
RETURNS TABLE(can_view boolean, scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT upo.can_view, upo.scope
    FROM public.user_permission_overrides upo
    WHERE upo.user_id = auth.uid()
      AND upo.resource_key = resource
  UNION ALL
  SELECT pp.can_view, pp.scope
    FROM public.position_permissions pp
    WHERE pp.position_name = public.current_user_position()
      AND pp.resource_key = resource
      AND NOT EXISTS (
        SELECT 1 FROM public.user_permission_overrides upo2
        WHERE upo2.user_id = auth.uid()
          AND upo2.resource_key = resource
      )
  LIMIT 1
$$;

-- 3. Diagnostic helper -- shows the effective matrix for ONE user, flagged.
-- Useful from the Settings UI and from psql.
CREATE OR REPLACE FUNCTION public.effective_matrix_for_user(target_user_id uuid)
RETURNS TABLE(
  resource_key   text,
  resource_label text,
  category       text,
  can_view       boolean,
  can_edit       boolean,
  scope          text,
  is_overridden  boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_position AS (
    SELECT e.position
    FROM auth.users u
    LEFT JOIN public.employees e ON lower(trim(e.email)) = lower(trim(u.email))
    WHERE u.id = target_user_id
    LIMIT 1
  )
  SELECT
    pr.key,
    pr.label,
    pr.category,
    COALESCE(upo.can_view, pp.can_view, false)       AS can_view,
    COALESCE(upo.can_edit, pp.can_edit, false)       AS can_edit,
    COALESCE(upo.scope,    pp.scope,    'self')      AS scope,
    (upo.user_id IS NOT NULL)                        AS is_overridden
  FROM public.permission_resources pr
  LEFT JOIN public.position_permissions pp
    ON pp.resource_key = pr.key
   AND pp.position_name = (SELECT position FROM my_position)
  LEFT JOIN public.user_permission_overrides upo
    ON upo.resource_key = pr.key
   AND upo.user_id = target_user_id
  ORDER BY pr.sort_order
$$;
