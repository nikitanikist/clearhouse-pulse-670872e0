REVOKE EXECUTE ON FUNCTION public.current_user_employee_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_position() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_department() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_location() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_name() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_employee_row(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_notes(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_can(text) FROM public, anon;