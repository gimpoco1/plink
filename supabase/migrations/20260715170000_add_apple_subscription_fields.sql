alter type public.subscription_provider
  add value if not exists 'apple';
alter table public.subscriptions
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_latest_transaction_id text,
  add column if not exists apple_environment text;
create unique index if not exists subscriptions_apple_original_transaction_id_idx
  on public.subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
