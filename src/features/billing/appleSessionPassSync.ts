import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import type { AppleTransaction } from "./applePurchases";
import { SUBSCRIPTION_SYNCED_EVENT } from "./appleSubscriptionSync";

async function readInvokeError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      return "Apple could not verify this Session Pass.";
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
    : "Apple could not verify this Session Pass.";
}

export async function syncAppleSessionPass(
  transaction: Pick<AppleTransaction, "id">,
) {
  if (!supabase || !hasSupabaseConfig) {
    throw new Error("Session Pass verification is not configured yet.");
  }

  const { data, error } = await supabase.functions.invoke<{
    active?: boolean;
    sessionLimit?: number;
    error?: string;
  }>("sync-apple-session-pass", {
    body: { transactionId: transaction.id },
  });
  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(data.error);

  window.dispatchEvent(new Event(SUBSCRIPTION_SYNCED_EVENT));
  return data;
}
