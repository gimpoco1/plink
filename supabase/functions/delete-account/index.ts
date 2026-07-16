import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  requireUser,
  stripe,
} from "../_shared/stripe.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const user = await requireUser(request.headers.get("Authorization"));
    const admin = createAdminClient();
    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("provider,subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    const subscriptionProvider = subscription?.provider ?? "stripe";

    if (subscriptionProvider === "stripe" && subscription?.subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.subscription_id,
        );
        if (stripeSubscription.status !== "canceled") {
          await stripe.subscriptions.cancel(subscription.subscription_id);
        }
      } catch (error) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? (error as { code?: unknown }).code
            : null;
        if (code !== "resource_missing") throw error;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return jsonResponse({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete account.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
