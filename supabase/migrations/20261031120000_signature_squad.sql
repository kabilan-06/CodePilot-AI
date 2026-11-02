-- CodePilot AI signature-squad tables.
-- Each feature persists its runs here; `approvals` is the single source of truth
-- for human-in-the-loop sign-off before any destructive operation.

create table if not exists public.twin_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text not null,
  repo text not null,
  ref text not null,
  tree_sha text not null,
  file_count integer not null default 0,
  stats jsonb not null default '{}'::jsonb,
  graph jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists twin_snapshots_repo_lookup
  on public.twin_snapshots (user_id, owner, repo, ref, created_at desc);

create table if not exists public.radar_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text not null,
  repo text not null,
  ref text not null,
  mode text not null default 'full-repo',
  input_summary text not null default '',
  overall_risk integer not null default 0,
  verdict jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists radar_reports_repo_lookup
  on public.radar_reports (user_id, owner, repo, created_at desc);

create table if not exists public.swarm_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text not null,
  repo text not null,
  ref text not null default 'main',
  task text not null,
  status text not null default 'running',
  transcript jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '{}'::jsonb,
  verdict jsonb null,
  model text not null default '',
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists swarm_runs_lookup
  on public.swarm_runs (user_id, owner, repo, created_at desc);

create table if not exists public.heal_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text null,
  repo text null,
  ref text null,
  error_text text not null,
  status text not null default 'diagnosed',
  diagnosis jsonb not null default '{}'::jsonb,
  patch jsonb not null default '[]'::jsonb,
  sandbox jsonb not null default '{}'::jsonb,
  error jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists heal_runs_lookup
  on public.heal_runs (user_id, created_at desc);

create table if not exists public.visual_qa_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'screenshots',
  target_url text not null default '',
  address text null,
  overall jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visual_qa_runs_lookup
  on public.visual_qa_runs (user_id, created_at desc);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  digest text not null,
  risk text not null default 'medium',
  status text not null default 'pending',
  decision_note text null,
  asked_at timestamptz not null default now(),
  decided_at timestamptz null,
  expires_at timestamptz not null default now() + interval '30 minutes',
  consumed_at timestamptz null
);

create index if not exists approvals_pending_lookup
  on public.approvals (user_id, status, expires_at desc);

alter table public.twin_snapshots enable row level security;
alter table public.radar_reports enable row level security;
alter table public.swarm_runs enable row level security;
alter table public.heal_runs enable row level security;
alter table public.visual_qa_runs enable row level security;
alter table public.approvals enable row level security;

create policy "twin_snapshots: user CRUD" on public.twin_snapshots
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "radar_reports: user CRUD" on public.radar_reports
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "swarm_runs: user CRUD" on public.swarm_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "heal_runs: user CRUD" on public.heal_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "visual_qa_runs: user CRUD" on public.visual_qa_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "approvals: user CRUD" on public.approvals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
