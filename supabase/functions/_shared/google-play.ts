import { importPKCS8, SignJWT } from "npm:jose@6.1.3";
import { createAdminClient } from "./supabase.ts";

const PACKAGE_NAME = "com.plinkscore.app";
const PRODUCT_ID = "plink_pro";
const BILLING_PERIOD_BY_BASE_PLAN = {
  "monthly-auto": "monthly",
  yearly: "yearly",
} as const;
const ACTIVE_DATABASE_STATUSES = new Set(["active", "trialing"]);
const ENTITLED_GOOGLE_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleSubscriptionPurchase = {
  subscriptionState?: string;
  latestOrderId?: string;
  regionCode?: string;
  acknowledgementState?: string;
  externalAccountIdentifiers?: {
    obfuscatedExternalAccountId?: string;
  };
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
    offerDetails?: {
      basePlanId?: string;
    };
  }>;
};

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

function getServiceAccount() {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Google Play verification is not configured.");

  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  } catch {
    throw new Error("Google Play service account credentials are invalid.");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Google Play service account credentials are incomplete.");
  }
  return parsed as ServiceAccount;
}

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const account = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(account.private_key, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/androidpublisher",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setAudience(account.token_uri ?? "https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch(
    account.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const payload = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!tokenResponse.ok || !payload.access_token) {
    console.error("Google OAuth token request failed", tokenResponse.status);
    throw new Error(
      payload.error_description || "Google Play verification is unavailable.",
    );
  }

  cachedAccessToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.value;
}

async function googlePlayRequest(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://androidpublisher.googleapis.com${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    console.error("Google Play API request failed", response.status, path);
    throw new Error(
      payload.error?.message ||
        "Google Play could not verify this subscription.",
    );
  }
  return response;
}

function validatePurchaseToken(value: string) {
  const token = value.trim();
  if (
    token.length < 10 || token.length > 4096 || /[\s\u0000-\u001f]/.test(token)
  ) {
    throw new Error("A valid Google Play purchase token is required.");
  }
  return token;
}

async function hashUserId(userId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(userId),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function loadPurchase(purchaseToken: string) {
  const response = await googlePlayRequest(
    `/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}` +
      `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
  );
  return (await response.json()) as GoogleSubscriptionPurchase;
}

async function acknowledgePurchase(purchaseToken: string) {
  await googlePlayRequest(
    `/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}` +
      `/purchases/subscriptions/${encodeURIComponent(PRODUCT_ID)}` +
      `/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: "POST", body: "{}" },
  );
}

export async function syncGooglePlayPurchase(
  rawPurchaseToken: string,
  expectedUserId: string,
) {
  const purchaseToken = validatePurchaseToken(rawPurchaseToken);
  const admin = createAdminClient();
  const { data: tokenOwner, error: tokenOwnerError } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("google_purchase_token", purchaseToken)
    .maybeSingle();
  if (tokenOwnerError) throw tokenOwnerError;
  if (tokenOwner && tokenOwner.user_id !== expectedUserId) {
    throw new Error(
      "This Google Play purchase belongs to a different Plink account.",
    );
  }

  const purchase = await loadPurchase(purchaseToken);
  const expectedAccountId = await hashUserId(expectedUserId);
  if (
    purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !==
      expectedAccountId
  ) {
    throw new Error(
      "This Google Play purchase belongs to a different Plink account.",
    );
  }

  const lineItem = (purchase.lineItems ?? [])
    .filter((item) => item.productId === PRODUCT_ID && item.expiryTime)
    .sort(
      (left, right) =>
        new Date(right.expiryTime ?? 0).getTime() -
        new Date(left.expiryTime ?? 0).getTime(),
    )[0];
  const basePlanId = lineItem?.offerDetails?.basePlanId;
  const billingPeriod = basePlanId && basePlanId in BILLING_PERIOD_BY_BASE_PLAN
    ? BILLING_PERIOD_BY_BASE_PLAN[
      basePlanId as keyof typeof BILLING_PERIOD_BY_BASE_PLAN
    ]
    : null;
  if (!lineItem || !billingPeriod) {
    throw new Error("This purchase is not a supported Plink Pro subscription.");
  }

  const expiryTime = lineItem.expiryTime ?? null;
  const expiryMillis = expiryTime ? new Date(expiryTime).getTime() : 0;
  const state = purchase.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED";
  const active = expiryMillis > Date.now() && ENTITLED_GOOGLE_STATES.has(state);
  const cancelAtPeriodEnd = active &&
    (state === "SUBSCRIPTION_STATE_CANCELED" ||
      lineItem.autoRenewingPlan?.autoRenewEnabled === false);
  const status = active ? "active" : state === "SUBSCRIPTION_STATE_ON_HOLD" ||
      state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    ? "past_due"
    : state === "SUBSCRIPTION_STATE_EXPIRED" ||
        state === "SUBSCRIPTION_STATE_CANCELED" ||
        state === "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED"
    ? "canceled"
    : "inactive";

  const { data: existing, error: existingError } = await admin
    .from("subscriptions")
    .select("provider,plan,status")
    .eq("user_id", expectedUserId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (
    !active &&
    existing &&
    existing.provider !== "google" &&
    existing.plan === "pro" &&
    ACTIVE_DATABASE_STATUSES.has(existing.status)
  ) {
    return { active: true, billingPeriod: null, provider: existing.provider };
  }

  const { error: upsertError } = await admin.from("subscriptions").upsert(
    {
      user_id: expectedUserId,
      provider: "google",
      customer_id: null,
      subscription_id: purchaseToken,
      price_id: PRODUCT_ID,
      billing_period: billingPeriod,
      plan: active ? "pro" : "free",
      status,
      current_period_end: expiryTime,
      cancel_at_period_end: cancelAtPeriodEnd,
      cancel_at: cancelAtPeriodEnd ? expiryTime : null,
      canceled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
      apple_original_transaction_id: null,
      apple_latest_transaction_id: null,
      apple_environment: null,
      google_purchase_token: purchaseToken,
      google_latest_order_id: purchase.latestOrderId ?? null,
      google_base_plan_id: basePlanId,
      google_subscription_state: state,
      google_region_code: purchase.regionCode ?? null,
    },
    { onConflict: "user_id" },
  );
  if (upsertError) throw upsertError;

  if (
    purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" &&
    state !== "SUBSCRIPTION_STATE_PENDING"
  ) {
    try {
      await acknowledgePurchase(purchaseToken);
    } catch (error) {
      // The verified entitlement is already persisted. A foreground sync or
      // the next lifecycle notification will retry acknowledgment.
      console.error("Google Play purchase acknowledgment failed", error);
    }
  }

  return { active, billingPeriod, provider: "google" as const };
}
