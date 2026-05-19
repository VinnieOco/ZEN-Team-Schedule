-- If an earlier draft added department, rename it to class_code.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_entries'
      and column_name = 'department'
  ) then
    alter table public.time_entries rename column department to class_code;
  end if;
end $$;
