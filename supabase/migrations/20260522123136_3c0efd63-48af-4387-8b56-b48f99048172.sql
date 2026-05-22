create policy "profiles_admin_select_all" on public.profiles for select to authenticated using (public.current_security_level() = 1);

create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.current_security_level() = 1) with check (public.current_security_level() = 1);