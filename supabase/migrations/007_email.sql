create table email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null,
  subject text not null,
  body text not null,
  signature text not null default '',
  reply_to text,
  sender_display_name text,
  enabled boolean not null default true,
  version integer not null default 1,
  unique (company_id, type)
);
create index email_templates_company_idx on email_templates(company_id);

create table email_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  type text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'delivered', 'failed', 'canceled')),
  resend_id text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  created_by uuid references auth.users(id),
  template_version integer
);
create index email_logs_company_idx on email_logs(company_id);
create index email_logs_application_idx on email_logs(application_id);
create index email_logs_resend_id_idx on email_logs(resend_id);

-- rejection_records.email_log_id references email_logs, added after both tables exist.
alter table rejection_records
  add constraint rejection_records_email_log_fk foreign key (email_log_id) references email_logs(id) on delete set null;
