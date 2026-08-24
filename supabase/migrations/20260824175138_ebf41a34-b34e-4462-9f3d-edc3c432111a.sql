REVOKE EXECUTE ON FUNCTION public.current_security_level() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_employee(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon;