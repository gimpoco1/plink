create table if not exists public.apple_referral_offers (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null
    references public.referral_codes (id) on delete cascade,
  apple_product_id text not null,
  billing_period text not null,
  apple_offer_reference_name text not null unique,
  apple_custom_code text not null unique,
  redemption_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint apple_referral_offers_billing_period_check
    check (billing_period in ('monthly', 'yearly')),
  constraint apple_referral_offers_custom_code_check
    check (apple_custom_code ~ '^[A-Z0-9-]{3,64}$'),
  constraint apple_referral_offers_redemption_url_check
    check (redemption_url ~ '^https://apps\.apple\.com/redeem\?'),
  unique (referral_code_id, apple_product_id)
);

create table if not exists public.apple_referral_redemption_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  apple_referral_offer_id uuid not null
    references public.apple_referral_offers (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists apple_referral_redemption_intents_pending_idx
  on public.apple_referral_redemption_intents (user_id, created_at desc)
  where consumed_at is null;

alter table public.referral_attributions
  add column if not exists provider text not null default 'stripe',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_offer_reference_name text;

alter table public.referral_attributions
  alter column stripe_subscription_id drop not null;

alter table public.referral_attributions
  drop constraint if exists referral_attributions_provider_check;
alter table public.referral_attributions
  add constraint referral_attributions_provider_check
    check (provider in ('stripe', 'apple'));

alter table public.referral_attributions
  drop constraint if exists referral_attributions_provider_identity_check;
alter table public.referral_attributions
  add constraint referral_attributions_provider_identity_check
    check (
      (provider = 'stripe' and stripe_subscription_id is not null
        and apple_original_transaction_id is null)
      or
      (provider = 'apple' and apple_original_transaction_id is not null
        and stripe_subscription_id is null)
    );

create unique index if not exists referral_attributions_apple_transaction_key
  on public.referral_attributions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

create table if not exists public.apple_referral_transactions (
  id uuid primary key default gen_random_uuid(),
  referral_attribution_id uuid not null
    references public.referral_attributions (id) on delete cascade,
  referrer_user_id uuid references auth.users (id) on delete set null,
  referred_user_id uuid references auth.users (id) on delete set null,
  apple_transaction_id text not null unique,
  apple_original_transaction_id text not null,
  apple_product_id text not null,
  apple_offer_reference_name text,
  currency text,
  customer_price_milliunits bigint,
  commission_rate_bps integer not null,
  commission_milliunits bigint,
  status text not null default 'pending',
  purchased_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint apple_referral_transactions_currency_check
    check (currency is null or currency ~ '^[a-z]{3}$'),
  constraint apple_referral_transactions_amounts_check
    check (
      (customer_price_milliunits is null or customer_price_milliunits >= 0)
      and (commission_milliunits is null or commission_milliunits >= 0)
    ),
  constraint apple_referral_transactions_rate_check
    check (commission_rate_bps > 0 and commission_rate_bps <= 10000),
  constraint apple_referral_transactions_status_check
    check (status in ('pending', 'paid', 'reversed', 'adjustment_required'))
);

create index if not exists apple_referral_transactions_referrer_idx
  on public.apple_referral_transactions (referrer_user_id, purchased_at desc);

alter table public.apple_referral_offers enable row level security;
alter table public.apple_referral_redemption_intents enable row level security;
alter table public.apple_referral_transactions enable row level security;

revoke all on table public.apple_referral_offers
  from public, anon, authenticated;
revoke all on table public.apple_referral_redemption_intents
  from public, anon, authenticated;
revoke all on table public.apple_referral_transactions
  from public, anon, authenticated;

grant select on table public.apple_referral_transactions to authenticated;

drop policy if exists "Referrers can read their Apple transactions"
  on public.apple_referral_transactions;
create policy "Referrers can read their Apple transactions"
  on public.apple_referral_transactions
  for select
  to authenticated
  using (auth.uid() = referrer_user_id);
