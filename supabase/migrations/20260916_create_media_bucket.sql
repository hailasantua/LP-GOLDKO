-- Criação do bucket 'media' para imagens e vídeos da landing page
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800, -- Limite de 50MB (suporta fotos em alta resolução e vídeos para web)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

-- Habilitar RLS em storage.objects caso não esteja
alter table storage.objects enable row level security;

-- Limpar policies anteriores do bucket 'media' para evitar duplicações
drop policy if exists "Mídia pública pode ser visualizada por todos" on storage.objects;
drop policy if exists "Administradores podem fazer upload de mídia" on storage.objects;
drop policy if exists "Administradores podem atualizar mídia" on storage.objects;
drop policy if exists "Administradores podem deletar mídia" on storage.objects;

-- 1. Leitura pública para que qualquer visitante veja as fotos e vídeos no site
create policy "Mídia pública pode ser visualizada por todos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- 2. Upload de arquivos por administradores autenticados
create policy "Administradores podem fazer upload de mídia"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (
      coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
      or (select auth.jwt() ->> 'email') = 'goldkorv@gmail.com'
    )
  );

-- 3. Atualização de arquivos por administradores
create policy "Administradores podem atualizar mídia"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and (
      coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
      or (select auth.jwt() ->> 'email') = 'goldkorv@gmail.com'
    )
  );

-- 4. Exclusão de arquivos por administradores
create policy "Administradores podem deletar mídia"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (
      coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
      or (select auth.jwt() ->> 'email') = 'goldkorv@gmail.com'
    )
  );
