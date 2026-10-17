import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import { SUBSCRIPTION_SYNCED_EVENT } from "./appleSubscriptionSync";

async function readInvokeError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      return "Google Play could not verify this subscription.";
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
    : "Google Play could not verify this subscription.";
}

export async function syncGooglePlaySubscription(purchaseToken?: string) {
  if (!supabase || !hasSupabaseConfig) {
    throw new Error("Subscription verification is not configured yet.");
  }

  const { data, error } = await supabase.functions.invoke<{
    active?: boolean;
    billingPeriod?: "monthly" | "yearly" | null;
    error?: string;
  }>("sync-google-play-subscription", {
    body: purchaseToken ? { purchaseToken } : {},
  });

  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(data.error);

  window.dispatchEvent(new Event(SUBSCRIPTION_SYNCED_EVENT));
  return data;
}
