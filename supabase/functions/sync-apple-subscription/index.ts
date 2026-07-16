import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { syncAppleSubscriptionByTransaction } from "../_shared/apple.ts";
import {
  createAdminClient,
  requireUser,
} from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const user = await requireUser(request.headers.get("Authorization"));
    const body = (await request.json().catch(() => ({}))) as {
      transactionId?: unknown;
    };
    let transactionId =
      typeof body.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    if (!transactionId) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("subscriptions")
        .select("provider,subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.provider !== "apple" || !data.subscription_id) {
        return jsonResponse({ active: false, billingPeriod: null });
      }
      transactionId = data.subscription_id;
    }

    const result = await syncAppleSubscriptionByTransaction(
      transactionId,
      user.id,
    );
    return jsonResponse({
      active: result?.active ?? false,
      billingPeriod: result?.billingPeriod ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Apple subscription verification failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
