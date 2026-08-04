-- Extensions
create extension if not exists "pgcrypto";

-- Generic updated_at trigger, reused by every table with an updated_at column.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- auth_company_ids() and auth_has_role() live in 010_rls_policies.sql, right
-- before their first use — both are LANGUAGE sql functions and Postgres
-- validates their bodies against the schema at CREATE FUNCTION time, so they
-- must be defined after company_members exists (created in 002_core_tables.sql).
