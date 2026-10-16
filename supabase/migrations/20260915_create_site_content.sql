-- Conteúdo editável da landing page. A página pública pode ler; somente admins editam.
create table if not exists public.site_content (
  id text primary key,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;

revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update on table public.site_content to authenticated;

create policy "Conteúdo público pode ser lido"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "Administradores podem inserir conteúdo"
  on public.site_content for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and updated_by = (select auth.uid())
  );

create policy "Administradores podem atualizar conteúdo"
  on public.site_content for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and updated_by = (select auth.uid())
  );

insert into public.site_content (id, content)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
