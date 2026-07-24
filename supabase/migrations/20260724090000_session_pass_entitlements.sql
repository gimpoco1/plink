create table if not exists public.session_pass_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  product_id text not null,
  transaction_id text not null,
  status text not null default 'active',
  session_limit integer not null default 100,
  purchased_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint session_pass_purchases_provider_check
    check (provider in ('apple', 'stripe')),
  constraint session_pass_purchases_status_check
    check (status in ('active', 'refunded', 'revoked')),
  constraint session_pass_purchases_limit_check
    check (session_limit >= 100),
  constraint session_pass_purchases_provider_transaction_key
    unique (provider, transaction_id)
);

create index if not exists session_pass_purchases_user_status_idx
  on public.session_pass_purchases (user_id, status);

create or replace function public.set_session_pass_purchases_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists session_pass_purchases_set_updated_at
  on public.session_pass_purchases;
create trigger session_pass_purchases_set_updated_at
before update on public.session_pass_purchases
for each row
execute function public.set_session_pass_purchases_updated_at();

alter table public.session_pass_purchases enable row level security;

drop policy if exists "Users can read their session pass purchases"
  on public.session_pass_purchases;
create policy "Users can read their session pass purchases"
  on public.session_pass_purchases
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.session_pass_purchases from anon;
revoke insert, update, delete on public.session_pass_purchases
  from authenticated;
grant select on public.session_pass_purchases to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_pass_purchases'
  ) then
    alter publication supabase_realtime
      add table public.session_pass_purchases;
  end if;
end
$$;

comment on table public.session_pass_purchases is
  'Server-verified permanent session-capacity purchases.';
comment on column public.session_pass_purchases.session_limit is
  'Total owned-session capacity unlocked by this purchase.';
