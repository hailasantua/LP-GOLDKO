-- Chat de Empresas: guarda o nome da empresa e permite contato por e-mail no lugar do WhatsApp.
alter table public.leads_onboarding
  add column if not exists empresa_nome text,
  add column if not exists email text;

alter table public.leads_onboarding
  alter column whatsapp drop not null;

alter table public.leads_onboarding
  drop constraint if exists leads_onboarding_contato_check;

alter table public.leads_onboarding
  add constraint leads_onboarding_contato_check
  check (whatsapp is not null or email is not null);
