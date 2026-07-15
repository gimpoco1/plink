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

## Publish a New iOS Build to TestFlight

Use this checklist for every TestFlight upload. The version shown to users and
the build number are controlled by the Xcode App target, not the `version` in
`package.json`.

The project currently uses:

- Bundle ID: `com.plinkscore.app`
- Marketing version: `1.0`
- Uploaded TestFlight build: `1`
- Next build to upload: `1.0 (2)`

For later uploads, keep version `1.0` while testing the same release and
increase only the build number: `2`, `3`, `4`, and so on. Increase the marketing
version when starting a genuinely new App Store version, for example `1.1`.

### 1. Prepare and verify the web build

From the repository root:

```bash
node --version
git status --short
npm run ios:sync
```

Confirm that:

- Node is version 22 or later.
- `.env.local` contains the intended production Supabase configuration.
- `npm run ios:sync` finishes successfully.
- Only the changes intended for this build are present.

`ios:sync` builds the production web app, copies `dist/` into the iOS project,
and updates Capacitor plugins. Always run it before archiving. Do not edit
`ios/App/App/public` directly because the next sync replaces it.

### 2. Open Xcode and increment the build number

```bash
npm run ios:open
```

In Xcode:

1. Select the blue **App** project in the Project navigator.
2. Select the **App** target.
3. Open **General**.
4. Under **Identity**, leave **Version** as `1.0` for this release.
5. Change **Build** from `1` to `2` for the next upload.
6. For every later upload, increment Build again. Never upload the same
   version/build combination twice after Apple has accepted it.
7. Open **Signing & Capabilities** and confirm:
   - Team is the correct Apple Developer team.
   - Bundle Identifier is `com.plinkscore.app`.
   - **Automatically manage signing** is enabled.
   - Sign in with Apple remains present if the build uses Apple login.

Do not change the bundle identifier for an update. App Store Connect associates
the upload with Plink using the bundle ID and marketing version.

### 3. Smoke-test the exact synced build

Before archiving, select an iPhone simulator or connected iPhone and click
**Run**. At minimum, test:

1. Cold launch and launch-screen transition.
2. Guest game creation and scoring.
3. New-player creation with the software keyboard visible.
4. Tab switching and independent tab scrolling.
5. Manage Players editing and removal.
6. Google and Apple sign-in, including cancelling the sign-in flow.
7. Backgrounding the app and returning to it.

Fix any issue, rerun `npm run ios:sync`, and repeat this smoke test before
creating the archive.

### 4. Create an archive

1. In Xcode's run-destination menu, select **Any iOS Device (arm64)** or the
   equivalent generic iOS device destination. Do not select a simulator.
2. Choose **Product > Archive**.
3. Wait for the archive to finish. Xcode should open **Organizer**.
4. If Organizer does not open, choose **Window > Organizer**, then select
   **Archives** and the newest Plink archive.
5. Confirm the archive shows the intended version and build, such as `1.0 (2)`.

If **Archive** is disabled, a simulator is probably still selected as the run
destination.

### 5. Validate and upload the archive

From the selected archive in Organizer:

1. Click **Validate App** and complete validation.
2. Resolve validation errors before continuing. Review warnings as well.
3. Click **Distribute App**.
4. Choose **App Store Connect**.
5. Choose **Upload**.
6. Keep the normal automatic signing and symbol-upload options unless Xcode
   reports a specific reason to change them.
7. Review the summary and click **Upload**.
8. Wait for Xcode to report that the upload completed successfully.

Use the normal **App Store Connect** upload option. Do not choose **TestFlight
Internal Only** unless the archive must never be used for external TestFlight
testing or an App Store release; Apple restricts an internal-only build to
internal tester groups.

### 6. Wait for App Store Connect processing

1. Open [App Store Connect](https://appstoreconnect.apple.com/).
2. Open **Apps > Plink > TestFlight**.
3. Find the new build under iOS version `1.0`.
4. Wait until its processing status completes. Apple sends an email when
   processing finishes.
5. Open the build and resolve any **Missing Compliance** prompt. Keep the answer
   consistent with `ITSAppUsesNonExemptEncryption = false` in the iOS project
   and the app's current use of standard system HTTPS/TLS.
6. Review any warnings shown for the processed build.

Processing is controlled by Apple. If a build remains in **Processing** for
more than 24 hours, check its delivery status and contact Apple Developer
Support or file Feedback Assistant feedback.

### 7. Add the build to the internal TestFlight group

If the internal group has **Enable automatic distribution** enabled, the new
eligible build may already be available to everyone in that group. Verify this
rather than uploading again.

For manual distribution:

1. In **Plink > TestFlight**, select the internal testing group in the sidebar.
2. Click **Add Builds**, or click the **+** next to Builds.
3. Select the newly processed build, such as `1.0 (2)`.
4. Click **Next**.
5. Enter **What to Test** notes.
6. Click **Add**.
7. Confirm the intended testers are listed in the group.

Internal testers must also be App Store Connect users with access to Plink. If
someone is missing from the invitation list, add them under **Users and
Access** first or correct their app access/role.

Reusable **What to Test** template:

```text
Plink 1.0 build <BUILD_NUMBER>

Please test:
- Cold launch: logo position, background, and no launch-screen flicker
- Guest game creation, scoring, timers, and dice
- Add New Player while the iPhone keyboard is visible
- Player-list height and scrolling with the keyboard open and closed
- Manage Players editing, removal, and the "In game" label
- Home, Sessions, Stats, and Players tab switching and scroll positions
- Google and Apple sign-in, successful return, and cancellation
- Background/resume and a full app restart

When reporting a problem, include:
- iPhone model and iOS version
- Exact steps to reproduce
- Screenshot or screen recording
- Whether it happens every time
```

### 8. Install and verify through TestFlight

On the tester's iPhone:

1. Open **TestFlight** using the Apple Account that accepted the invitation.
2. Open **Plink**.
3. Tap **Update** or **Install**.
4. Confirm TestFlight shows the expected build number.
5. Repeat the smoke-test checklist using the TestFlight build, not the Xcode
   development installation.

Internal TestFlight builds remain available for testing for up to 90 days. A
new build does not require a new invitation for testers who are already in the
group.

### 9. Common TestFlight upload problems

- **The uploaded app contains old changes:** run `npm run ios:sync`, then create
  a new archive with a higher build number.
- **The build number has already been used:** increment **Build** in the Xcode
  App target and archive again.
- **Archive is disabled:** select a generic iOS device instead of a simulator.
- **The build does not appear immediately:** check App Store Connect processing
  and the upload email before uploading again.
- **No Builds Available for a tester:** add the processed build to that tester's
  internal group and confirm the tester has App Store Connect access to Plink.
- **The launch screen still looks old in the simulator:** iOS caches launch
  screens. Delete Plink from the simulator, then install it again.
- **Signing fails:** confirm the Team, automatic signing, bundle ID, Apple
  account login in Xcode, and current developer agreements.

Official references:

- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Build upload statuses](https://developer.apple.com/help/app-store-connect/reference/app-uploads/build-upload-statuses/)

## Automatic TestFlight Publishing with Xcode Cloud

Xcode Cloud can automatically build and publish Plink whenever a commit reaches
the GitHub `main` branch. It is preferred over a GitHub Actions publishing job
for this project because Apple manages signing credentials, provisioning, build
numbers, archiving, and TestFlight delivery.

The repository includes:

```text
ios/App/ci_scripts/ci_post_clone.sh
```

Xcode Cloud runs this script after cloning the repository. It installs Node 22
when necessary, installs locked npm dependencies, builds the web app, and runs
`cap sync ios` before Xcode creates the archive.

### One-time Xcode Cloud setup

This part must be completed by an Apple Developer team member because it grants
Xcode Cloud access to the GitHub repository and TestFlight app.

1. Push `ios/App/ci_scripts/ci_post_clone.sh` and the rest of the project to
   GitHub before configuring the workflow.
2. Open `ios/App/App.xcodeproj` in Xcode.
3. Select the **App** project, then open the **Report navigator**.
4. Click **Cloud**, then **Get Started**, or choose **Product > Xcode Cloud >
   Create Workflow** if that option is available in the installed Xcode
   version.
5. Select the correct Apple Developer team and the Plink product.
6. Authorize Xcode Cloud to access `gimpoco1/plink` on GitHub when prompted.
7. Name the workflow `Main to TestFlight`.

Configure the workflow as follows:

- **Start Condition:** Branch Changes
- **Branch:** `main`
- **Auto-cancel Builds:** Enabled
- **Action:** Archive
- **Platform:** iOS
- **Scheme:** App
- **Deployment Preparation:** TestFlight and App Store
- **Post-action:** TestFlight Internal Testing
- **Tester group:** Select the existing Plink internal tester group

Do not configure a TestFlight external-testing post-action unless external beta
review and distribution are intentionally required.

### Set the first automatic build number

Xcode Cloud automatically assigns an integer build number and increases it for
each build. Because Plink `1.0 (1)` has already been uploaded manually, set the
first Xcode Cloud build to `2` to avoid a collision:

1. Open **App Store Connect > Apps > Plink > Xcode Cloud**.
2. Open **Settings > Build Number**.
3. Click **Edit** next to **Next Build Number**.
4. Enter `2` and save.

After this, do not manually edit the Xcode build number for Xcode Cloud builds.
The cloud build number becomes the TestFlight build number automatically.

### Add Xcode Cloud environment variables

`.env.local` is intentionally not committed, so configure the client build
values in the workflow's **Environment > Environment Variables** section:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_STRIPE_PUBLISHABLE_KEY
VITE_SHOW_AD_SLOTS=false
VITE_SHOW_AD_PLACEHOLDERS=false
```

Copy the first three values from the production `.env.local`. Mark sensitive
values as **Secret** or **Keep value redacted**. Do not add server-side secrets
such as `STRIPE_SECRET_KEY`, Apple `.p8` keys, or Supabase service-role keys;
the client build neither needs nor should receive them.

### Test the workflow safely

Before enabling automatic publishing on every push:

1. Save the workflow with its start condition temporarily set to **Manual**.
2. Start one build from the current `main` commit.
3. In the Xcode Cloud build log, confirm that `ci_post_clone.sh` completes.
4. Confirm the Archive action succeeds with bundle ID
   `com.plinkscore.app`.
5. Confirm the post-action uploads the expected build to the internal
   TestFlight group.
6. Install that build through TestFlight and run the smoke-test checklist.
7. Edit the workflow and enable the `main` **Branch Changes** start condition.

### Normal automated workflow

After the one-time setup, publishing becomes:

```bash
git checkout main
git pull --ff-only
git merge <tested-branch>
git push origin main
```

The push then performs this pipeline:

```text
Push to main
  -> Xcode Cloud clones the commit
  -> ci_post_clone.sh builds and syncs Capacitor
  -> Xcode Cloud assigns the next build number
  -> Xcode Cloud archives and signs Plink
  -> Xcode Cloud uploads the build
  -> TestFlight distributes it to the internal group
```

Monitor it in **App Store Connect > Plink > Xcode Cloud > Builds** or in
Xcode's Cloud build reports. Testers receive the new build after Apple finishes
processing it.

### Recommended safety rule

Automatic TestFlight publishing does not publish the app publicly to the App
Store. Keep App Store submission and release manual. Also protect the `main`
branch in GitHub so only reviewed and passing changes can trigger a tester
build.

Official references:

- [Configure an Xcode Cloud workflow](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow)
- [Create a distribution workflow](https://developer.apple.com/documentation/xcode/creating-a-workflow-that-builds-your-app-for-distribution)
- [Xcode Cloud workflow reference](https://developer.apple.com/documentation/xcode/xcode-cloud-workflow-reference)
- [Write custom build scripts](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)
- [Xcode Cloud build numbers](https://developer.apple.com/documentation/xcode/setting-the-next-build-number-for-xcode-cloud-builds)

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
