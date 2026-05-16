-- Categories: all authenticated read; managers and admins write.

drop policy if exists "authenticated_all_categories" on public.allocation_categories;
drop policy if exists "categories_authenticated" on public.allocation_categories;
drop policy if exists "categories_select" on public.allocation_categories;
drop policy if exists "categories_write_elevated" on public.allocation_categories;

create policy "categories_select" on public.allocation_categories
  for select to authenticated using (true);

create policy "categories_write_elevated" on public.allocation_categories
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());
