-- Logs every Melvina chat turn so the product team can see what people
-- actually ask about and improve the assistant/product accordingly.
-- Platform-admin only — not exposed to tenant clients (no RLS policies;
-- service-role bypasses RLS, which is the only role that ever touches this).

create table if not exists melvina_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists melvina_messages_company_idx on melvina_messages(company_id);
create index if not exists melvina_messages_created_idx on melvina_messages(created_at desc);

alter table melvina_messages enable row level security;
