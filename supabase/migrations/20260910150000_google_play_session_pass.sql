alter table public.session_pass_purchases
  drop constraint if exists session_pass_purchases_provider_check;

alter table public.session_pass_purchases
  add constraint session_pass_purchases_provider_check
  check (provider in ('apple', 'google', 'stripe'));

comment on column public.session_pass_purchases.transaction_id is
  'Provider transaction identifier. Google Play rows store the purchase token.';
