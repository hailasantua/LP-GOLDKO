# Painel de conteúdo

O painel editorial fica em `/painel` (ou `/conteudo`) e usa o Supabase Auth integrado com o **Supabase Storage**.

## Ativação no Supabase (Passo a passo)

### 1. Criar a tabela de conteúdo
No painel do seu projeto Supabase, acesse **SQL Editor**, cole e execute o script:
- `supabase/migrations/20260915_create_site_content.sql`

### 2. Criar o bucket de armazenamento e permissões de mídia
No **SQL Editor**, cole e execute o script:
- `supabase/migrations/20260916_create_media_bucket.sql`

Isso criará o bucket público `media` no Supabase Storage com suporte a uploads de fotos e vídeos de até 50MB.

### 3. Criar usuário administrador
1. Acesse **Authentication > Users** e crie o usuário responsável (ex: `goldkorv@gmail.com`).
2. Marque o usuário como administrador rodando no **SQL Editor**:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'goldkorv@gmail.com';
```

3. Se o usuário já estava conectado, faça logout e login novamente para atualizar a sessão.
4. Acesse `/painel` e comece a editar.

---

## Conteúdos e Upload de Mídia

- **Upload Direto**: Os campos de mídia (fotos e vídeos do Hero, cards de ajuda, empresas, cardápio, depoimentos, etc.) contam com área de upload e drag-and-drop.
- **Armazenamento no Supabase**: Ao soltar ou selecionar um arquivo, ele é enviado automaticamente para o Supabase Storage no bucket `media`, gerando a URL pública oficial.
- **Pré-visualização**: O painel exibe miniaturas imediatas de imagens e reprodutor para vídeos `.mp4` / `.webm`.
- **Flexibilidade**: Caso precise utilizar uma URL externa pontual, basta clicar em "Editar URL manualmente".
