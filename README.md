# Plink

Plink is a playful score tracker for board games, card games, party games, and any match where players collect points over time. It helps you start a game quickly, update scores during play, spot the winner, and keep a record of past sessions.

## What It Does

- Start a new game in seconds with a custom game name and player list.
- Track points live with quick score controls.
- Use different win styles, including highest score, lowest score, and race-to-target.
- Add optional timers for faster rounds.
- Save players so regular groups are easy to set up again.
- Reopen recent sessions, duplicate past setups, rename sessions, and clean up old ones.
- Check stats like wins, activity, and trends over time.
- Use it locally as a guest or sign in to keep your data with your account.

## Main Areas

- Home: Start, resume, and quickly set up games.
- Sessions: Browse and manage your game history.
- Stats: See who is winning and how your games are evolving.
- Players: Manage your saved player list.
- Game View: Run the live scoreboard while you play.

## Why People Use It

- Fast for casual game nights.
- Flexible for different scoring rules.
- Clean and focused interface.
- Keeps your sessions and player history organized.

## Session Pass billing setup

The Session Pass is a permanent account entitlement that raises the owned-game
history limit from 12 to 100. It does not unlock Pro features, and shared games
do not consume its allowance.

Before enabling the purchase in production:

1. Apply `supabase/migrations/20260724090000_session_pass_entitlements.sql`.
2. Deploy `sync-apple-session-pass`, `create-session-pass-checkout`,
   `apple-subscription-webhook`, and `stripe-webhook`.
3. In App Store Connect, create a non-consumable In-App Purchase with product ID
   `com.plinkscore.app.sessionpass.100`.
4. In Stripe, create a one-time Session Pass price and set its ID as the
   `STRIPE_PRICE_SESSION_PASS_100` Edge Function secret.
5. Ensure the existing Apple server API and Stripe webhook secrets are set, and
   that the Stripe webhook listens for Checkout completion and refund events.

Do not expose `STRIPE_PRICE_SESSION_PASS_100` as a Vite client variable.
