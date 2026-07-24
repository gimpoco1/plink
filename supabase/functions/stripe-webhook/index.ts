import Stripe from "npm:stripe@16.12.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  mapStripeSubscriptionStatus,
  stripe,
} from "../_shared/stripe.ts";
import {
  persistSessionPassPurchase,
  revokeStripeSessionPass,
  STRIPE_SESSION_PASS_PRODUCT_KEY,
} from "../_shared/session_pass.ts";

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

function getStripePaymentIntentId(
  value: string | Stripe.PaymentIntent | null,
) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function getStripeSubscriptionCurrentPeriodEnd(
  subscription: Stripe.Subscription,
) {
  const timestamp = subscription.current_period_end ?? null;

  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
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
  expectedUserId?: string,
) {
  const userId =
    expectedUserId ??
    (await findSubscriptionOwner(admin, {
      userId: subscription.metadata.user_id,
      customerId: getStripeCustomerId(subscription.customer),
      subscriptionId: subscription.id,
    }));

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
  const currentPeriodEnd = getStripeSubscriptionCurrentPeriodEnd(subscription);
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
      "provider,plan,subscription_id,status,billing_period,current_period_end,price_id,cancel_at_period_end,cancel_at,canceled_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const hasActiveAppleSubscription =
    existingSubscription?.provider === "apple" &&
    existingSubscription.plan === "pro" &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(existingSubscription.status);
  if (hasActiveAppleSubscription) {
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id);
      console.warn(
        `Canceled Stripe subscription ${subscription.id} from event ${eventType} because user ${userId} has an active Apple subscription.`,
      );
      return;
    }

    console.warn(
      `Ignored Stripe event ${eventType} because user ${userId} has an active Apple subscription.`,
    );
    return;
  }

  const shouldPreserveExistingStatus =
    eventType === "customer.subscription.created" &&
    nextStatus === "inactive" &&
    existingSubscription?.subscription_id === subscription.id &&
    existingSubscription.status !== null &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(existingSubscription.status);

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "stripe",
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
      apple_original_transaction_id: null,
      apple_latest_transaction_id: null,
      apple_environment: null,
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
    userId,
  );
}

async function syncCheckoutSessionPass(
  session: Stripe.Checkout.Session,
) {
  if (session.metadata?.product !== STRIPE_SESSION_PASS_PRODUCT_KEY) {
    return false;
  }
  if (session.payment_status !== "paid") {
    throw new Error(
      `Session Pass checkout ${session.id} completed without payment.`,
    );
  }

  const userId =
    session.metadata.user_id ??
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  const transactionId = getStripePaymentIntentId(session.payment_intent);
  if (!userId || !transactionId) {
    throw new Error(
      `Unable to resolve Session Pass checkout ${session.id}.`,
    );
  }

  await persistSessionPassPurchase({
    userId,
    provider: "stripe",
    productId: STRIPE_SESSION_PASS_PRODUCT_KEY,
    transactionId,
    purchasedAt: new Date(session.created * 1000).toISOString(),
  });
  return true;
}

async function syncStripeSubscriptionById(
  admin: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  eventType: Stripe.Event.Type,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertStripeSubscription(admin, subscription, eventType);
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
      case "checkout.session.async_payment_succeeded":
        {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!(await syncCheckoutSessionPass(session))) {
            await syncCheckoutSessionSubscription(admin, session);
          }
        }
        break;
      case "charge.refunded":
        {
          const charge = event.data.object as Stripe.Charge;
          const transactionId = getStripePaymentIntentId(charge.payment_intent);
          if (
            transactionId &&
            charge.amount_refunded >= charge.amount
          ) {
            await revokeStripeSessionPass(
              transactionId,
              new Date(event.created * 1000).toISOString(),
            );
          }
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        {
          const subscription = event.data.object as Stripe.Subscription;
          await syncStripeSubscriptionById(admin, subscription.id, event.type);
        }
        break;
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
