alter type public.subscription_provider
  add value if not exists 'google';

alter table public.subscriptions
  add column if not exists google_purchase_token text,
  add column if not exists google_latest_order_id text,
  add column if not exists google_base_plan_id text,
  add column if not exists google_subscription_state text,
  add column if not exists google_region_code text;

create unique index if not exists subscriptions_google_purchase_token_idx
  on public.subscriptions (google_purchase_token)
  where google_purchase_token is not null;

comment on column public.subscriptions.google_purchase_token is
  'Server-verified Google Play purchase token. Never accepted as proof of entitlement without checking the Android Publisher API.';
