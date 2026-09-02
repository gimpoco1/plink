create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  code text not null unique,
  stripe_promotion_code_id text not null unique,
  discount_percent numeric(5, 2) not null,
  commission_rate_bps integer not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint referral_codes_code_format_check
    check (code ~ '^[A-Z0-9-]{3,64}$'),
  constraint referral_codes_stripe_promotion_code_id_check
    check (stripe_promotion_code_id ~ '^promo_'),
  constraint referral_codes_discount_percent_check
    check (discount_percent > 0 and discount_percent <= 100),
  constraint referral_codes_commission_rate_check
    check (commission_rate_bps > 0 and commission_rate_bps <= 10000)
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid references public.referral_codes (id) on delete set null,
  referrer_user_id uuid references auth.users (id) on delete set null,
  referred_user_id uuid references auth.users (id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text not null unique,
  discount_percent numeric(5, 2) not null,
  commission_rate_bps integer not null,
  status text not null default 'active',
  attributed_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint referral_attributions_distinct_users_check
    check (
      referrer_user_id is null
      or referred_user_id is null
      or referrer_user_id <> referred_user_id
    ),
  constraint referral_attributions_discount_percent_check
    check (discount_percent > 0 and discount_percent <= 100),
  constraint referral_attributions_commission_rate_check
    check (commission_rate_bps > 0 and commission_rate_bps <= 10000),
  constraint referral_attributions_status_check
    check (status in ('active', 'canceled'))
);

create unique index if not exists referral_attributions_referred_user_id_key
  on public.referral_attributions (referred_user_id)
  where referred_user_id is not null;

create index if not exists referral_attributions_referrer_user_id_idx
  on public.referral_attributions (referrer_user_id, attributed_at desc);

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referral_attribution_id uuid not null
    references public.referral_attributions (id) on delete cascade,
  referrer_user_id uuid references auth.users (id) on delete set null,
  referred_user_id uuid references auth.users (id) on delete set null,
  stripe_invoice_id text not null unique,
  stripe_charge_id text,
  stripe_subscription_id text not null,
  currency text not null,
  paid_amount integer not null,
  eligible_revenue_amount integer not null,
  refunded_revenue_amount integer not null default 0,
  commission_rate_bps integer not null,
  commission_amount integer not null,
  status text not null default 'pending',
  paid_at timestamptz not null,
  available_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint referral_commissions_amounts_check
    check (
      paid_amount >= 0
      and eligible_revenue_amount >= 0
      and refunded_revenue_amount >= 0
      and refunded_revenue_amount <= eligible_revenue_amount
      and commission_amount >= 0
    ),
  constraint referral_commissions_rate_check
    check (commission_rate_bps > 0 and commission_rate_bps <= 10000),
  constraint referral_commissions_currency_check
    check (currency ~ '^[a-z]{3}$'),
  constraint referral_commissions_status_check
    check (status in ('pending', 'paid', 'reversed', 'adjustment_required'))
);

create index if not exists referral_commissions_referrer_user_id_idx
  on public.referral_commissions (referrer_user_id, paid_at desc);

create index if not exists referral_commissions_stripe_charge_id_idx
  on public.referral_commissions (stripe_charge_id)
  where stripe_charge_id is not null;

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_commissions enable row level security;

revoke all on table public.referral_codes from public, anon, authenticated;
revoke all on table public.referral_attributions from public, anon, authenticated;
revoke all on table public.referral_commissions from public, anon, authenticated;

grant select on table public.referral_codes to authenticated;
grant select on table public.referral_attributions to authenticated;
grant select on table public.referral_commissions to authenticated;

drop policy if exists "Users can read their own referral code"
  on public.referral_codes;
create policy "Users can read their own referral code"
  on public.referral_codes
  for select
  to authenticated
  using (auth.uid() = owner_user_id);

drop policy if exists "Users can read their referral attributions"
  on public.referral_attributions;
create policy "Users can read their referral attributions"
  on public.referral_attributions
  for select
  to authenticated
  using (
    auth.uid() = referrer_user_id
    or auth.uid() = referred_user_id
  );

drop policy if exists "Referrers can read their commissions"
  on public.referral_commissions;
create policy "Referrers can read their commissions"
  on public.referral_commissions
  for select
  to authenticated
  using (auth.uid() = referrer_user_id);
