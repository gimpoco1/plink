create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text,
  subscription_id text,
  price_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.subscriptions
  add column if not exists customer_id text,
  add column if not exists subscription_id text,
  add column if not exists price_id text,
  add column if not exists plan text not null default 'free',
  add column if not exists status text not null default 'inactive',
  add column if not exists current_period_end timestamptz,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
create unique index if not exists subscriptions_customer_id_key
  on public.subscriptions (customer_id)
  where customer_id is not null;
create unique index if not exists subscriptions_subscription_id_key
  on public.subscriptions (subscription_id)
  where subscription_id is not null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_plan_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_plan_check
      check (plan in ('free', 'pro'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status in ('active', 'trialing', 'inactive', 'past_due', 'canceled'));
  end if;
end
$$;
create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_subscriptions_updated_at();
alter table public.subscriptions enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_select_own'
  ) then
    create policy subscriptions_select_own
      on public.subscriptions
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
