revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.current_security_level() from public, anon, authenticated;
revoke execute on function public.can_view_employee(public.employee_position) from public, anon, authenticated;