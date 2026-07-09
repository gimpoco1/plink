import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  getRequiredEnv,
  normalizeAppOrigin,
  requireUser,
  stripe,
} from "../_shared/stripe.ts";

const DUPLICATE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const user = await requireUser(request.headers.get("Authorization"));
    const body = (await request.json()) as {
      billingPeriod?: "monthly" | "yearly";
      origin?: string;
    };

    const billingPeriod =
      body.billingPeriod === "monthly" || body.billingPeriod === "yearly"
        ? body.billingPeriod
        : null;
    if (!billingPeriod) {
      return jsonResponse(
        { error: "billingPeriod must be monthly or yearly." },
        { status: 400 },
      );
    }

    const origin = normalizeAppOrigin(body.origin);
    if (!origin) {
      return jsonResponse(
        { error: "A valid app origin is required." },
        { status: 400 },
      );
    }

    const priceId =
      billingPeriod === "monthly"
        ? getRequiredEnv("STRIPE_PRICE_PRO_MONTHLY")
        : getRequiredEnv("STRIPE_PRICE_PRO_YEARLY");
    const admin = createAdminClient();
    const { data: existingSubscription } = await admin
      .from("subscriptions")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSubscription?.customer_id) {
      const existingStripeSubscriptions = await stripe.subscriptions.list({
        customer: existingSubscription.customer_id,
        status: "all",
        limit: 100,
      });
      const duplicateSubscription = existingStripeSubscriptions.data.find(
        (subscription) =>
          DUPLICATE_SUBSCRIPTION_STATUSES.has(subscription.status),
      );

      if (duplicateSubscription) {
        return jsonResponse(
          {
            error:
              "You already have a subscription for this account. Open the billing portal to manage or cancel it before starting a new one.",
          },
          { status: 409 },
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      customer: existingSubscription?.customer_id ?? undefined,
      customer_email:
        existingSubscription?.customer_id || !user.email ? undefined : user.email,
      metadata: {
        user_id: user.id,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
          billing_period: billingPeriod,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
