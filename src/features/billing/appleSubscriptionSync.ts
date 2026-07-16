import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import type { AppleTransaction } from "./applePurchases";

export const SUBSCRIPTION_SYNCED_EVENT = "plink:subscription-synced";

async function readInvokeError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      return "Apple could not verify this subscription.";
    }
  }

  if (
    error instanceof FunctionsFetchError ||
    error instanceof FunctionsRelayError
  ) {
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Apple could not verify this subscription.";
}

export async function syncAppleSubscription(
  transaction?: Pick<AppleTransaction, "id">,
) {
  if (!supabase || !hasSupabaseConfig) {
    throw new Error("Subscription verification is not configured yet.");
  }

  const { data, error } = await supabase.functions.invoke<{
    active?: boolean;
    billingPeriod?: "monthly" | "yearly" | null;
    error?: string;
  }>("sync-apple-subscription", {
    body: transaction ? { transactionId: transaction.id } : {},
  });

  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(data.error);

  window.dispatchEvent(new Event(SUBSCRIPTION_SYNCED_EVENT));
  return data;
}
