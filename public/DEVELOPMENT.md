# Development

## Local App

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment Variables

Client env vars live in `.env.local`. Use `.env.example` as the template.

Main client vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_ENTITLEMENTS_OVERRIDE_PLAN`

Ads/testing vars:

- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SESSIONS_SLOT_ID`
- `VITE_ADSENSE_PLAYERS_SLOT_ID`
- `VITE_SHOW_AD_SLOTS`
- `VITE_SHOW_AD_PLACEHOLDERS`

Notes:

- Never commit `.env.local`
- Never put `STRIPE_SECRET_KEY` in client env vars
- `VITE_ENTITLEMENTS_OVERRIDE_PLAN=pro` is useful for local UI checks

## Supabase CLI

Install CLI on macOS:

```bash
brew install supabase/tap/supabase
```

Log in:

```bash
supabase login
```

Link this repo to a project:

```bash
supabase link --project-ref <your-project-ref>
```

Useful checks:

```bash
supabase --version
supabase projects list
cat supabase/.temp/linked-project.json
```

Notes:

- `supabase/.temp/` is local CLI state only
- it is safe to delete and recreate by linking again
- do not commit `supabase/.temp/`

## Supabase Project Files

These should stay in git:

- `supabase/config.toml`
- `supabase/functions/`
- `supabase/migrations/` when present

These should not be committed:

- `supabase/.temp/`

## Edge Functions

Current functions:

- `create-checkout-session`
- `create-customer-portal-session`
- `stripe-webhook`

Deploy a single function:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy stripe-webhook
```

Important:

- `stripe-webhook` must have JWT verification disabled in `supabase/config.toml`
- after changing `supabase/config.toml`, redeploy the affected function

## Function Secrets

Set Stripe secrets in Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PRO_YEARLY=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

List secret names/digests:

```bash
supabase secrets list
```

Notes:

- secrets are server-side only
- `.env.local` does not affect deployed Edge Functions
- if Stripe values change, update secrets in Supabase, not just locally

## Database

If migrations exist in `supabase/migrations`, apply them with:

```bash
supabase db push
```

Useful DB checks after billing changes:

```sql
select
  user_id,
  plan,
  status,
  billing_period,
  current_period_end,
  cancel_at_period_end,
  cancel_at,
  canceled_at,
  subscription_id,
  price_id,
  customer_id,
  created_at,
  updated_at
from public.subscriptions
order by updated_at desc
limit 20;
```

## Stripe Billing Setup

This app uses:

- Stripe Checkout for new subscriptions
- Stripe Billing Portal for management
- Supabase Edge Functions for Checkout, Portal, and Webhooks

Required Stripe objects:

- 1 monthly recurring price
- 1 yearly recurring price

Use price IDs, not product IDs:

- correct: `price_...`
- wrong: `prod_...`

## Stripe Webhook

Webhook URL:

```text
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

After creating or recreating the webhook:

1. copy the `whsec_...` signing secret
2. run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
3. redeploy `stripe-webhook`

## Billing Debugging

If Checkout fails before opening:

1. check `STRIPE_SECRET_KEY`
2. check `STRIPE_PRICE_PRO_MONTHLY`
3. check `STRIPE_PRICE_PRO_YEARLY`
4. confirm test/live mode matches everywhere

Useful Stripe API checks:

```bash
curl https://api.stripe.com/v1/prices/price_... -u sk_test_...:
curl https://api.stripe.com/v1/events?limit=10 -u sk_test_...:
```

If webhook deliveries fail:

1. inspect the event in Stripe
2. inspect delivery attempts
3. verify the webhook destination belongs to the same Stripe sandbox/account
4. resend the event after fixing the issue

If Supabase never updates the subscription row:

1. confirm Stripe delivery status is `200`
2. confirm `stripe-webhook` is deployed after the latest code changes
3. confirm JWT verification is disabled for `stripe-webhook`
4. confirm the row uses the correct `user_id`

## Billing Behavior Notes

Current behavior:

- `active` and `trialing` unlock Pro
- `inactive`, `past_due`, and `canceled` map back to Free
- `cancel_at_period_end = true` means the user stays Pro until the current period ends
- the UI should show `Ending ...` for scheduled cancellations

To prevent duplicate subscriptions, the checkout function checks Stripe for existing subscriptions before creating a new one.

## Common Stripe Test Cards

Successful payment:

```text
4242 4242 4242 4242
```

Declined card:

```text
4000 0000 0000 0002
```

3DS/authentication flow:

```text
4000 0025 0000 3155
```

Use any future expiry and any valid CVC.

## Common Recovery Actions

Re-link Supabase project:

```bash
supabase link --project-ref <your-project-ref>
```

Clear local Supabase CLI temp state:

```bash
rm -rf supabase/.temp
```

Redeploy all billing functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy stripe-webhook
```