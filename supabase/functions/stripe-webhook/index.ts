import Stripe from "npm:stripe@16.12.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  mapStripeSubscriptionStatus,
  stripe,
} from "../_shared/stripe.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
}

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function normalizeBillingPeriod(value: unknown): "monthly" | "yearly" | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

function getStripeCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function getStripeSubscriptionId(
  value: string | Stripe.Subscription | null,
) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function findSubscriptionOwner(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    userId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
  },
) {
  if (params.userId) {
    return params.userId;
  }

  if (params.subscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("subscription_id", params.subscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (params.customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("customer_id", params.customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

async function upsertStripeSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  eventType: Stripe.Event.Type,
) {
  const userId = await findSubscriptionOwner(admin, {
    userId: subscription.metadata.user_id,
    customerId: getStripeCustomerId(subscription.customer),
    subscriptionId: subscription.id,
  });

  if (!userId) {
    console.warn(
      `Unable to resolve subscription owner for Stripe subscription ${subscription.id}.`,
    );
    return;
  }

  const customerId = getStripeCustomerId(subscription.customer);
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const billingPeriod = normalizeBillingPeriod(
    subscription.metadata.billing_period,
  );
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const cancelAt = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null;
  const nextStatus = mapStripeSubscriptionStatus(subscription.status);
  const nextPlan = ACTIVE_SUBSCRIPTION_STATUSES.has(nextStatus) ? "pro" : "free";
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select(
      "subscription_id,status,billing_period,current_period_end,price_id,cancel_at_period_end,cancel_at,canceled_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const shouldPreserveExistingStatus =
    eventType === "customer.subscription.created" &&
    nextStatus === "inactive" &&
    existingSubscription?.subscription_id === subscription.id &&
    existingSubscription.status !== null &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(existingSubscription.status);

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: shouldPreserveExistingStatus
        ? existingSubscription?.price_id ?? priceId
        : priceId,
      billing_period: existingSubscription?.billing_period ?? billingPeriod,
      plan: shouldPreserveExistingStatus ? "pro" : nextPlan,
      status: shouldPreserveExistingStatus
        ? existingSubscription.status
        : nextStatus,
      current_period_end: shouldPreserveExistingStatus
        ? existingSubscription?.current_period_end ?? currentPeriodEnd
        : currentPeriodEnd,
      cancel_at_period_end: shouldPreserveExistingStatus
        ? existingSubscription?.cancel_at_period_end ?? false
        : subscription.cancel_at_period_end,
      cancel_at: shouldPreserveExistingStatus
        ? existingSubscription?.cancel_at ?? cancelAt
        : cancelAt,
      canceled_at: shouldPreserveExistingStatus
        ? existingSubscription?.canceled_at ?? canceledAt
        : canceledAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

async function upsertCheckoutSession(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = await findSubscriptionOwner(admin, {
    userId:
      session.metadata?.user_id ??
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null),
    customerId: getStripeCustomerId(session.customer),
    subscriptionId: getStripeSubscriptionId(session.subscription),
  });

  if (!userId) {
    throw new Error(
      `Unable to resolve checkout session owner for Stripe session ${session.id}.`,
    );
  }

  const customerId = getStripeCustomerId(session.customer);
  const subscriptionId = getStripeSubscriptionId(session.subscription);
  const billingPeriod = normalizeBillingPeriod(session.metadata?.billing_period);
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select(
      "plan,status,billing_period,current_period_end,price_id,cancel_at_period_end,cancel_at,canceled_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan: existingSubscription?.plan ?? "pro",
      status: existingSubscription?.status ?? "inactive",
      billing_period: existingSubscription?.billing_period ?? billingPeriod,
      current_period_end: existingSubscription?.current_period_end ?? null,
      price_id: existingSubscription?.price_id ?? null,
      cancel_at_period_end:
        existingSubscription?.cancel_at_period_end ?? false,
      cancel_at: existingSubscription?.cancel_at ?? null,
      canceled_at: existingSubscription?.canceled_at ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

async function syncCheckoutSessionSubscription(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const subscriptionId = getStripeSubscriptionId(session.subscription);
  if (!subscriptionId) {
    throw new Error(
      `Stripe checkout session ${session.id} completed without a subscription id.`,
    );
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertStripeSubscription(
    admin,
    subscription,
    "customer.subscription.updated",
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
    const admin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed":
        {
          const session = event.data.object as Stripe.Checkout.Session;
          await upsertCheckoutSession(admin, session);
          await syncCheckoutSessionSubscription(admin, session);
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertStripeSubscription(
          admin,
          event.data.object as Stripe.Subscription,
          event.type,
        );
        break;
      default:
        break;
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handling failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
