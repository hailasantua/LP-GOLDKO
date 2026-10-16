-- Tabela para armazenar leads do onboarding de nutricionistas e empresas
create table if not exists public.leads_onboarding (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('nutricionista', 'empresa')),
  nome text not null,
  whatsapp text not null,
  -- Campos adicionais por tipo
  -- Nutricionista
  qtd_pacientes text,
  interesse_nutri text[],
  -- Empresa
  qtd_colaboradores text,
  interesse_empresa text[],
  -- Metadados
  utm_source text,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'qualificado', 'convertido', 'perdido'))
);

-- Habilitar RLS
alter table public.leads_onboarding enable row level security;

-- Política: qualquer pessoa pode inserir (formulário público)
create policy "Inserção pública de leads"
  on public.leads_onboarding
  for insert
  to anon, authenticated
  with check (true);

-- Política: só autenticados podem ler
create policy "Leitura apenas autenticada"
  on public.leads_onboarding
  for select
  to authenticated
  using (true);
