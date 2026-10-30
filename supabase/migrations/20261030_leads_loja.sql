-- Loja (página) de onde veio o lead: flamboyant, buriti ou principal.
alter table public.leads_onboarding
  add column if not exists loja text not null default 'principal';

alter table public.leads_onboarding
  drop constraint if exists leads_onboarding_loja_check;
alter table public.leads_onboarding
  add constraint leads_onboarding_loja_check
  check (loja in ('flamboyant', 'buriti', 'principal'));

create index if not exists leads_onboarding_loja_idx on public.leads_onboarding (loja);
