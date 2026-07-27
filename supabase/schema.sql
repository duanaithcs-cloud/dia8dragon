create table if not exists public.dia8_workspaces (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.dia8_submissions (
  workspace_id text not null,
  class_id text not null,
  assignment_id text not null,
  student_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, assignment_id, student_id)
);

create index if not exists dia8_submissions_class_student_idx
  on public.dia8_submissions (workspace_id, class_id, student_id);

alter table public.dia8_workspaces enable row level security;
alter table public.dia8_submissions enable row level security;

-- Không tạo policy public. Chỉ Vercel Function dùng service role key truy cập hai bảng này.

-- Dia8Dragon 3.4.0 — Student Hybrid Sync (optional, local-first)
create table if not exists public.dia8_learning_sync (
  id text primary key,
  workspace_id text not null,
  learner_hash text not null,
  client_record_id text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  client_created_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists dia8_learning_sync_workspace_idx on public.dia8_learning_sync(workspace_id);
create index if not exists dia8_learning_sync_learner_idx on public.dia8_learning_sync(learner_hash);
create index if not exists dia8_learning_sync_type_idx on public.dia8_learning_sync(entity_type);
alter table public.dia8_learning_sync enable row level security;
-- Không tạo policy công khai. Endpoint Vercel dùng service-role phía máy chủ.
