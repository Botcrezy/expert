-- Create portfolio assets bucket (public)
insert into storage.buckets (id, name, public)
values ('portfolio-assets', 'portfolio-assets', true)
on conflict (id) do update set public = excluded.public;

-- Storage policies for portfolio-assets (owner-scoped write)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Portfolio assets: owner can upload'
  ) then
    create policy "Portfolio assets: owner can upload"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'portfolio-assets'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Portfolio assets: owner can update'
  ) then
    create policy "Portfolio assets: owner can update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'portfolio-assets'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Portfolio assets: owner can delete'
  ) then
    create policy "Portfolio assets: owner can delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'portfolio-assets'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;