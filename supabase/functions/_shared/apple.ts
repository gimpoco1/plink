import { importPKCS8, SignJWT } from "npm:jose@6.2.3";
import { createAdminClient } from "./supabase.ts";

enum Environment {
  PRODUCTION = "Production",
  SANDBOX = "Sandbox",
}

enum Status {
  ACTIVE = 1,
  EXPIRED = 2,
  BILLING_RETRY = 3,
  BILLING_GRACE_PERIOD = 4,
  REVOKED = 5,
}

enum AutoRenewStatus {
  OFF = 0,
  ON = 1,
}

type JWSTransactionDecodedPayload = {
  appAccountToken?: string;
  bundleId?: string;
  expiresDate?: number;
  originalTransactionId?: string;
  productId?: string;
  revocationDate?: number;
  transactionId?: string;
};

type JWSRenewalInfoDecodedPayload = {
  appAccountToken?: string;
  autoRenewStatus?: AutoRenewStatus | number;
  gracePeriodExpiresDate?: number;
};

type LastTransactionsItem = {
  signedRenewalInfo?: string;
  signedTransactionInfo?: string;
  status?: Status | number;
};

type StatusResponse = {
  bundleId?: string;
  data?: Array<{
    lastTransactions?: LastTransactionsItem[];
  }>;
};

const APPLE_BUNDLE_ID =
  Deno.env.get("APPLE_APP_BUNDLE_ID")?.trim() || "com.plinkscore.app";
const APPLE_PRODUCT_PERIOD: Readonly<
  Record<string, "monthly" | "yearly">
> = {
  "com.plinkscore.app.pro.monthly": "monthly",
  "com.plinkscore.app.pro.yearly": "yearly",
};
const ACTIVE_DATABASE_STATUSES = new Set(["active", "trialing"]);

type AppleSubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled";

type AppleSubscriptionSnapshot = {
  appAccountToken: string | null;
  originalTransactionId: string;
  latestTransactionId: string;
  productId: string;
  billingPeriod: "monthly" | "yearly";
  status: AppleSubscriptionStatus;
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
  environment: Environment;
};

const APPLE_API_BASE_URL: Readonly<Record<Environment, string>> = {
  [Environment.PRODUCTION]: "https://api.storekit.apple.com",
  [Environment.SANDBOX]: "https://api.storekit-sandbox.apple.com",
};

let signingKeyPromise: ReturnType<typeof importPKCS8> | null = null;
let cachedApiToken: { expiresAt: number; value: string } | null = null;

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name} environment variable.`);
  return value;
}

function getPrivateKey() {
  return getRequiredEnv("APPLE_IAP_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function getSigningKey() {
  signingKeyPromise ??= importPKCS8(getPrivateKey(), "ES256");
  return signingKeyPromise;
}

async function createAppleApiToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApiToken && cachedApiToken.expiresAt > now + 30) {
    return cachedApiToken.value;
  }

  const expiresAt = now + 5 * 60;
  const value = await new SignJWT({ bid: APPLE_BUNDLE_ID })
    .setProtectedHeader({
      alg: "ES256",
      kid: getRequiredEnv("APPLE_IAP_KEY_ID"),
      typ: "JWT",
    })
    .setIssuer(getRequiredEnv("APPLE_IAP_ISSUER_ID"))
    .setAudience("appstoreconnect-v1")
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(await getSigningKey());

  cachedApiToken = { expiresAt, value };
  return value;
}

async function getAllSubscriptionStatuses(
  transactionId: string,
  environment: Environment,
) {
  const response = await fetch(
    `${APPLE_API_BASE_URL[environment]}/inApps/v1/subscriptions/${
      encodeURIComponent(transactionId)
    }`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${await createAppleApiToken()}`,
      },
    },
  );

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(
      `Apple subscription API returned ${response.status}${
        details ? `: ${details}` : ""
      }`,
    );
  }

  return (await response.json()) as StatusResponse;
}

export function decodeAppleJws<T>(jws: string): T {
  const payload = jws.split(".")[1];
  if (!payload) throw new Error("Apple returned an invalid signed payload.");

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function toIsoDate(timestamp: number | undefined) {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function mapStatus(status: Status | number | undefined) {
  switch (status) {
    case Status.ACTIVE:
    case Status.BILLING_GRACE_PERIOD:
      return { status: "active" as const, active: true };
    case Status.BILLING_RETRY:
      return { status: "past_due" as const, active: false };
    case Status.REVOKED:
      return { status: "canceled" as const, active: false };
    default:
      return { status: "inactive" as const, active: false };
  }
}

function statusPriority(status: Status | number | undefined) {
  if (status === Status.ACTIVE || status === Status.BILLING_GRACE_PERIOD) {
    return 3;
  }
  if (status === Status.BILLING_RETRY) return 2;
  return 1;
}

function createSnapshot(
  item: LastTransactionsItem,
  environment: Environment,
): AppleSubscriptionSnapshot | null {
  if (!item.signedTransactionInfo) return null;
  const transaction = decodeAppleJws<JWSTransactionDecodedPayload>(
    item.signedTransactionInfo,
  );
  const renewal = item.signedRenewalInfo
    ? decodeAppleJws<JWSRenewalInfoDecodedPayload>(item.signedRenewalInfo)
    : null;
  const billingPeriod = transaction.productId
    ? APPLE_PRODUCT_PERIOD[transaction.productId]
    : null;

  if (
    transaction.bundleId !== APPLE_BUNDLE_ID ||
    !transaction.transactionId ||
    !transaction.originalTransactionId ||
    !transaction.productId ||
    !billingPeriod
  ) {
    return null;
  }

  const mappedStatus = mapStatus(item.status);
  const cancelAtPeriodEnd =
    mappedStatus.active && renewal?.autoRenewStatus === AutoRenewStatus.OFF;
  const currentPeriodTimestamp =
    item.status === Status.BILLING_GRACE_PERIOD
      ? renewal?.gracePeriodExpiresDate ?? transaction.expiresDate
      : transaction.expiresDate;

  return {
    appAccountToken:
      transaction.appAccountToken ?? renewal?.appAccountToken ?? null,
    originalTransactionId: transaction.originalTransactionId,
    latestTransactionId: transaction.transactionId,
    productId: transaction.productId,
    billingPeriod,
    status: mappedStatus.status,
    active: mappedStatus.active,
    currentPeriodEnd: toIsoDate(currentPeriodTimestamp),
    cancelAtPeriodEnd,
    cancelAt: cancelAtPeriodEnd
      ? toIsoDate(transaction.expiresDate)
      : null,
    canceledAt: toIsoDate(transaction.revocationDate),
    environment,
  };
}

async function loadSnapshotFromEnvironment(
  transactionId: string,
  environment: Environment,
) {
  const response = await getAllSubscriptionStatuses(transactionId, environment);
  if (response.bundleId && response.bundleId !== APPLE_BUNDLE_ID) {
    throw new Error("The Apple subscription belongs to a different app.");
  }

  const candidates = (response.data ?? [])
    .flatMap((group) => group.lastTransactions ?? [])
    .map((item) => ({
      item,
      snapshot: createSnapshot(item, environment),
    }))
    .filter(
      (
        candidate,
      ): candidate is {
        item: LastTransactionsItem;
        snapshot: AppleSubscriptionSnapshot;
      } => Boolean(candidate.snapshot),
    )
    .sort((left, right) => {
      const priority =
        statusPriority(right.item.status) - statusPriority(left.item.status);
      if (priority !== 0) return priority;
      const rightEnd = right.snapshot.currentPeriodEnd
        ? Date.parse(right.snapshot.currentPeriodEnd)
        : 0;
      const leftEnd = left.snapshot.currentPeriodEnd
        ? Date.parse(left.snapshot.currentPeriodEnd)
        : 0;
      return rightEnd - leftEnd;
    });

  return candidates[0]?.snapshot ?? null;
}

export async function loadAppleSubscriptionSnapshot(transactionId: string) {
  const trimmedId = transactionId.trim();
  if (!/^\d+$/.test(trimmedId)) {
    throw new Error("A valid Apple transaction is required.");
  }

  let lastError: unknown;
  for (const environment of [
    Environment.PRODUCTION,
    Environment.SANDBOX,
  ]) {
    try {
      const snapshot = await loadSnapshotFromEnvironment(
        trimmedId,
        environment,
      );
      if (snapshot) return snapshot;
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Apple subscription lookup failed", lastError);
  throw new Error("Apple could not verify this subscription.");
}

export async function persistAppleSubscription(
  snapshot: AppleSubscriptionSnapshot,
  expectedUserId?: string,
) {
  const admin = createAdminClient();
  let userId = expectedUserId ?? snapshot.appAccountToken;

  if (expectedUserId && !snapshot.appAccountToken) {
    throw new Error(
      "This purchase is not linked to a Plink account and cannot be restored here.",
    );
  }

  if (
    expectedUserId &&
    snapshot.appAccountToken &&
    snapshot.appAccountToken.toLowerCase() !== expectedUserId.toLowerCase()
  ) {
    throw new Error("This purchase belongs to a different Plink account.");
  }

  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("apple_original_transaction_id", snapshot.originalTransactionId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  if (!userId) {
    console.warn(
      `Apple transaction ${snapshot.latestTransactionId} has no Plink account token.`,
    );
    return null;
  }

  const { data: existing, error: existingError } = await admin
    .from("subscriptions")
    .select("provider,plan,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  const hasActiveStripeSubscription =
    existing?.provider === "stripe" &&
    existing.plan === "pro" &&
    ACTIVE_DATABASE_STATUSES.has(existing.status);
  if (hasActiveStripeSubscription && !snapshot.active) {
    return {
      active: true,
      billingPeriod: null,
      provider: "stripe" as const,
    };
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "apple",
      customer_id: null,
      subscription_id: snapshot.originalTransactionId,
      apple_original_transaction_id: snapshot.originalTransactionId,
      apple_latest_transaction_id: snapshot.latestTransactionId,
      apple_environment: snapshot.environment,
      price_id: snapshot.productId,
      billing_period: snapshot.billingPeriod,
      plan: snapshot.active ? "pro" : "free",
      status: snapshot.status,
      current_period_end: snapshot.currentPeriodEnd,
      cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      cancel_at: snapshot.cancelAt,
      canceled_at: snapshot.canceledAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  return {
    active: snapshot.active,
    billingPeriod: snapshot.billingPeriod,
    provider: "apple" as const,
  };
}

export async function syncAppleSubscriptionByTransaction(
  transactionId: string,
  expectedUserId?: string,
) {
  const snapshot = await loadAppleSubscriptionSnapshot(transactionId);
  return persistAppleSubscription(snapshot, expectedUserId);
}
