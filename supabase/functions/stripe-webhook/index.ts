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
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
    subscriptionId: subscription.id,
  });

  if (!userId) {
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const currentPeriodEnd = itemPeriodEnd
    ? new Date(itemPeriodEnd * 1000).toISOString()
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
      "subscription_id,status,current_period_end,price_id,cancel_at_period_end,cancel_at,canceled_at",
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
    customerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id,
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id,
  });

  if (!userId) {
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select(
      "plan,status,current_period_end,price_id,cancel_at_period_end,cancel_at,canceled_at",
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
        await upsertCheckoutSession(
          admin,
          event.data.object as Stripe.Checkout.Session,
        );
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
