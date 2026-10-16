-- Aceita todos os caminhos usados pelo chat público.
alter table public.leads_onboarding
  drop constraint if exists leads_onboarding_tipo_check;

alter table public.leads_onboarding
  add constraint leads_onboarding_tipo_check
  check (tipo in ('cliente', 'clube_nutri', 'nutricionista', 'empresa'));

-- O chat grava por uma função de servidor com service role. A tabela não precisa
-- aceitar INSERT direto do navegador, reduzindo spam e cadastros forjados.
drop policy if exists "Inserção pública de leads" on public.leads_onboarding;
revoke insert on table public.leads_onboarding from anon, authenticated;

-- Mantemos a tabela indisponível para leitura pública.
revoke select, update, delete on table public.leads_onboarding from anon;
