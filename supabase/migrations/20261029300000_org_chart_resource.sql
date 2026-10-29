-- Phase 8D (slice): add Org Chart to the permissions matrix.
-- Admins / Partners / HR / Operations & HR Coordinator see the whole firm.
-- Managers see their own subtree. Everyone else: off by default; the admin
-- can flip it on in Settings per position.

INSERT INTO public.permission_resources
  (key, label, category, supports_edit, supports_scope, sort_order, description)
VALUES
  ('nav:org_chart', 'Org Chart', 'nav', false, true, 35,
   'Visual firm hierarchy. Scope controls how much of the tree is visible.')
ON CONFLICT (key) DO UPDATE
  SET label=EXCLUDED.label, category=EXCLUDED.category,
      supports_edit=EXCLUDED.supports_edit, supports_scope=EXCLUDED.supports_scope,
      sort_order=EXCLUDED.sort_order, description=EXCLUDED.description;

-- Seed per-position defaults (do nothing if admin already configured)
DO $$
DECLARE v_pos text; v_is_admin boolean; v_is_manager boolean;
BEGIN
  FOR v_pos IN SELECT DISTINCT name FROM public.positions LOOP
    v_is_admin := lower(v_pos) IN ('partner','hr','operations & hr coordinator','admin','administrator');
    v_is_manager := lower(v_pos) LIKE 'manager%' OR lower(v_pos) LIKE '%manager';

    INSERT INTO public.position_permissions(position_name, resource_key, can_view, can_edit, scope)
    VALUES (v_pos, 'nav:org_chart', v_is_admin OR v_is_manager, false,
            CASE WHEN v_is_admin THEN 'all' WHEN v_is_manager THEN 'own_team' ELSE 'self' END)
    ON CONFLICT (position_name, resource_key) DO NOTHING;
  END LOOP;
END $$;
