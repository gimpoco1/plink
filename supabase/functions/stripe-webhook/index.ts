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
const REFERRAL_COMMISSION_HOLD_DAYS = 30;
const REFERRER_USER_ID_METADATA_KEY = "plink_referrer_user_id";

function getReferralCommissionBps() {
  const value = parsePositiveInteger(
    Deno.env.get("REFERRAL_COMMISSION_BPS")?.trim(),
    10000,
  );
  if (!value) {
    throw new Error(
      "REFERRAL_COMMISSION_BPS must be an integer between 1 and 10000.",
    );
  }
  return value;
}

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

function getStripeChargeId(
  value: string | Stripe.Charge | null,
) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function parsePositiveInteger(value: unknown, maximum: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function parsePositivePercentage(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
    ? parsed
    : null;
}

function getStripePromotionCodeId(
  discount: string | Stripe.Discount | Stripe.DeletedDiscount | null,
) {
  if (!discount || typeof discount === "string") return null;
  const promotionCode = discount.promotion_code;
  return typeof promotionCode === "string"
    ? promotionCode
    : promotionCode?.id ?? null;
}

async function syncReferralPromotionCode(
  admin: ReturnType<typeof createAdminClient>,
  promotionCodeId: string,
) {
  const promotionCode = await stripe.promotionCodes.retrieve(promotionCodeId, {
    expand: ["coupon"],
  });
  const referrerUserId =
    promotionCode.metadata?.[REFERRER_USER_ID_METADATA_KEY]?.trim();
  if (!referrerUserId) return null;

  const { data: referrer, error: referrerError } =
    await admin.auth.admin.getUserById(referrerUserId);
  if (referrerError || !referrer.user) {
    throw new Error(
      `Promotion Code ${promotionCode.id} references an unknown Plink user.`,
    );
  }

  const code = promotionCode.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,64}$/.test(code)) {
    throw new Error(
      `Promotion Code ${promotionCode.id} must use 3-64 letters, numbers, or dashes.`,
    );
  }

  const coupon =
    typeof promotionCode.coupon === "string"
      ? await stripe.coupons.retrieve(promotionCode.coupon)
      : promotionCode.coupon;
  const discountPercent =
    "deleted" in coupon || !coupon.valid
      ? null
      : parsePositivePercentage(coupon.percent_off);
  if (!discountPercent) {
    throw new Error(
      `Promotion Code ${promotionCode.id} must reference a valid percentage coupon.`,
    );
  }

  const { data, error } = await admin
    .from("referral_codes")
    .upsert(
      {
        owner_user_id: referrerUserId,
        code,
        stripe_promotion_code_id: promotionCode.id,
        discount_percent: discountPercent,
        commission_rate_bps: getReferralCommissionBps(),
        active: promotionCode.active,
      },
      { onConflict: "owner_user_id" },
    )
    .select(
      "id,owner_user_id,discount_percent,commission_rate_bps,stripe_promotion_code_id",
    )
    .single();
  if (error) throw error;
  return data;
}

async function findReferralCodeForInvoice(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
) {
  const expandedInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ["discounts"],
  });
  const promotionCodeIds = new Set<string>();
  const discounts = [
    expandedInvoice.discount,
    ...expandedInvoice.discounts,
    subscription.discount,
    ...subscription.discounts,
  ];

  for (const discount of discounts) {
    const promotionCodeId = getStripePromotionCodeId(discount);
    if (promotionCodeId) promotionCodeIds.add(promotionCodeId);
  }

  if (promotionCodeIds.size === 0) return null;

  const { data, error } = await admin
    .from("referral_codes")
    .select(
      "id,owner_user_id,discount_percent,commission_rate_bps,stripe_promotion_code_id",
    )
    .in("stripe_promotion_code_id", Array.from(promotionCodeIds))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  for (const promotionCodeId of promotionCodeIds) {
    const configuredCode = await syncReferralPromotionCode(
      admin,
      promotionCodeId,
    );
    if (configuredCode) return configuredCode;
  }

  return null;
}

function calculateRefundedRevenue(
  eligibleRevenueAmount: number,
  chargeAmount: number,
  chargeAmountRefunded: number,
) {
  if (chargeAmount <= 0 || chargeAmountRefunded <= 0) return 0;
  return Math.min(
    eligibleRevenueAmount,
    Math.round(
      eligibleRevenueAmount * (chargeAmountRefunded / chargeAmount),
    ),
  );
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

  const { error: attributionStatusError } = await admin
    .from("referral_attributions")
    .update({
      status: subscription.status === "canceled" ? "canceled" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (attributionStatusError) throw attributionStatusError;
}

async function syncReferralCommission(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
) {
  if (!invoice.paid || invoice.status !== "paid") return;

  const subscriptionId = getStripeSubscriptionId(invoice.subscription);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["discounts"],
  });
  const { data: storedAttribution, error: storedAttributionError } = await admin
    .from("referral_attributions")
    .select(
      "id,referrer_user_id,referred_user_id,discount_percent,commission_rate_bps",
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (storedAttributionError) throw storedAttributionError;

  let attributionId = storedAttribution?.id ?? null;
  let referrerUserId = storedAttribution?.referrer_user_id ?? null;
  let referredUserId = storedAttribution?.referred_user_id ?? null;
  let discountPercent = parsePositivePercentage(
    storedAttribution?.discount_percent,
  );
  let commissionRateBps = parsePositiveInteger(
    storedAttribution?.commission_rate_bps,
    10000,
  );

  if (!attributionId) {
    const referralCode = await findReferralCodeForInvoice(
      admin,
      invoice,
      subscription,
    );
    if (!referralCode) return;

    referrerUserId = referralCode.owner_user_id;
    referredUserId = await findSubscriptionOwner(admin, {
      userId: subscription.metadata.user_id,
      customerId: getStripeCustomerId(subscription.customer),
      subscriptionId,
    });
    discountPercent = parsePositivePercentage(referralCode.discount_percent);
    commissionRateBps = parsePositiveInteger(
      referralCode.commission_rate_bps,
      10000,
    );

    if (
      !referrerUserId ||
      !referredUserId ||
      referrerUserId === referredUserId ||
      !discountPercent ||
      !commissionRateBps
    ) {
      console.warn(
        `Ignored invalid referral attribution for subscription ${subscriptionId}.`,
      );
      return;
    }

    const { data: userAttribution, error: userAttributionError } = await admin
      .from("referral_attributions")
      .select(
        "id,stripe_subscription_id,referrer_user_id,referred_user_id,discount_percent,commission_rate_bps",
      )
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (userAttributionError) throw userAttributionError;

    if (
      userAttribution &&
      userAttribution.stripe_subscription_id !== subscriptionId
    ) {
      console.warn(
        `Ignored referral on ${subscriptionId}; user ${referredUserId} is already attributed.`,
      );
      return;
    }

    if (userAttribution) {
      attributionId = userAttribution.id;
      referrerUserId = userAttribution.referrer_user_id;
      referredUserId = userAttribution.referred_user_id;
      discountPercent = parsePositivePercentage(
        userAttribution.discount_percent,
      );
      commissionRateBps = parsePositiveInteger(
        userAttribution.commission_rate_bps,
        10000,
      );
    } else {
      const { data: insertedAttribution, error: attributionInsertError } =
        await admin
          .from("referral_attributions")
          .insert({
            referral_code_id: referralCode.id,
            referrer_user_id: referrerUserId,
            referred_user_id: referredUserId,
            stripe_customer_id: getStripeCustomerId(subscription.customer),
            stripe_subscription_id: subscriptionId,
            discount_percent: discountPercent,
            commission_rate_bps: commissionRateBps,
            status: subscription.status === "canceled" ? "canceled" : "active",
          })
          .select("id")
          .single();
      if (attributionInsertError) throw attributionInsertError;
      attributionId = insertedAttribution.id;
    }
  }

  if (
    !attributionId ||
    !referrerUserId ||
    !referredUserId ||
    !discountPercent ||
    !commissionRateBps
  ) {
    console.warn(
      `Referral attribution ${attributionId ?? "unknown"} is incomplete.`,
    );
    return;
  }

  const eligibleRevenueAmount = Math.max(
    0,
    invoice.total_excluding_tax ?? invoice.total,
  );
  const chargeId = getStripeChargeId(invoice.charge);
  const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null;
  const initialRefundedRevenueAmount = charge
    ? calculateRefundedRevenue(
        eligibleRevenueAmount,
        charge.amount,
        charge.amount_refunded,
      )
    : 0;
  const initialCommissionAmount = Math.floor(
    ((eligibleRevenueAmount - initialRefundedRevenueAmount) *
      commissionRateBps) /
      10000,
  );
  const paidAt = new Date(
    (invoice.status_transitions.paid_at ?? invoice.created) * 1000,
  );
  const availableAt = new Date(paidAt);
  availableAt.setUTCDate(
    availableAt.getUTCDate() + REFERRAL_COMMISSION_HOLD_DAYS,
  );

  const { data: existingCommission, error: commissionLookupError } =
    await admin
      .from("referral_commissions")
      .select("status,refunded_revenue_amount,commission_amount")
      .eq("stripe_invoice_id", invoice.id)
      .maybeSingle();
  if (commissionLookupError) throw commissionLookupError;

  const { error: commissionError } = await admin
    .from("referral_commissions")
    .upsert(
      {
        referral_attribution_id: attributionId,
        referrer_user_id: referrerUserId,
        referred_user_id: referredUserId,
        stripe_invoice_id: invoice.id,
        stripe_charge_id: chargeId,
        stripe_subscription_id: subscriptionId,
        currency: invoice.currency.toLowerCase(),
        paid_amount: Math.max(0, invoice.amount_paid),
        eligible_revenue_amount: eligibleRevenueAmount,
        refunded_revenue_amount:
          existingCommission?.refunded_revenue_amount ??
          initialRefundedRevenueAmount,
        commission_rate_bps: commissionRateBps,
        commission_amount:
          existingCommission?.commission_amount ?? initialCommissionAmount,
        status:
          existingCommission?.status ??
          (initialCommissionAmount === 0 ? "reversed" : "pending"),
        paid_at: paidAt.toISOString(),
        available_at: availableAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_invoice_id" },
    );
  if (commissionError) throw commissionError;
}

async function syncReferralRefund(
  admin: ReturnType<typeof createAdminClient>,
  charge: Stripe.Charge,
) {
  if (charge.amount <= 0 || charge.amount_refunded <= 0) return;

  const { data: commission, error: commissionLookupError } = await admin
    .from("referral_commissions")
    .select(
      "id,eligible_revenue_amount,commission_rate_bps,commission_amount,status",
    )
    .eq("stripe_charge_id", charge.id)
    .maybeSingle();
  if (commissionLookupError) throw commissionLookupError;
  if (!commission) return;

  const refundedRevenueAmount = calculateRefundedRevenue(
    commission.eligible_revenue_amount,
    charge.amount,
    charge.amount_refunded,
  );
  const remainingRevenue = Math.max(
    0,
    commission.eligible_revenue_amount - refundedRevenueAmount,
  );
  const nextCommissionAmount = Math.floor(
    (remainingRevenue * commission.commission_rate_bps) / 10000,
  );
  const nextStatus =
    commission.status === "paid" &&
    nextCommissionAmount < commission.commission_amount
      ? "adjustment_required"
      : nextCommissionAmount === 0
        ? "reversed"
        : "pending";

  const { error: refundUpdateError } = await admin
    .from("referral_commissions")
    .update({
      refunded_revenue_amount: refundedRevenueAmount,
      commission_amount: nextCommissionAmount,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commission.id);
  if (refundUpdateError) throw refundUpdateError;
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
    // Async payment methods can emit checkout.session.completed before the
    // payment settles. async_payment_succeeded will persist the entitlement.
    return true;
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
          await syncReferralRefund(admin, charge);
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
      case "invoice.paid":
        await syncReferralCommission(
          admin,
          event.data.object as Stripe.Invoice,
        );
        break;
      case "promotion_code.created":
      case "promotion_code.updated":
        await syncReferralPromotionCode(
          admin,
          (event.data.object as Stripe.PromotionCode).id,
        );
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
