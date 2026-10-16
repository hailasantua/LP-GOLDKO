create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  visitor_id text not null,
  session_id text not null,
  page_path text not null default '/',
  section text,
  source text,
  segment text,
  label text,
  destination text,
  device text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_segment_idx on public.analytics_events (segment);
alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

