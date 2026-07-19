alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancel_at timestamptz,
  add column if not exists canceled_at timestamptz;
