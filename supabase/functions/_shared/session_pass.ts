import { createAdminClient } from "./supabase.ts";

export const SESSION_PASS_LIMIT = 100;
export const APPLE_SESSION_PASS_PRODUCT_ID =
  "com.plinkscore.app.sessionpass.100";
export const STRIPE_SESSION_PASS_PRODUCT_KEY = "session_pass_100";

export type SessionPassProvider = "apple" | "stripe";
export type SessionPassStatus = "active" | "refunded" | "revoked";

export async function persistSessionPassPurchase(input: {
  userId: string;
  provider: SessionPassProvider;
  productId: string;
  transactionId: string;
  status?: SessionPassStatus;
  purchasedAt?: string | null;
  revokedAt?: string | null;
}) {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("session_pass_purchases")
    .select("user_id")
    .eq("provider", input.provider)
    .eq("transaction_id", input.transactionId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.user_id && existing.user_id !== input.userId) {
    throw new Error("This Session Pass belongs to a different Plink account.");
  }

  const status = input.status ?? "active";
  const { error } = await admin.from("session_pass_purchases").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      product_id: input.productId,
      transaction_id: input.transactionId,
      status,
      session_limit: SESSION_PASS_LIMIT,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
      revoked_at:
        status === "active"
          ? null
          : input.revokedAt ?? new Date().toISOString(),
    },
    { onConflict: "provider,transaction_id" },
  );
  if (error) throw error;

  return {
    active: status === "active",
    sessionLimit: SESSION_PASS_LIMIT,
  };
}

export async function revokeStripeSessionPass(
  transactionId: string,
  revokedAt?: string | null,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("session_pass_purchases")
    .update({
      status: "refunded",
      revoked_at: revokedAt ?? new Date().toISOString(),
    })
    .eq("provider", "stripe")
    .eq("transaction_id", transactionId);
  if (error) throw error;
}
