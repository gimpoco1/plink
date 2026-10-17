import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { syncGooglePlayPurchase } from "../_shared/google-play.ts";
import { createAdminClient, requireUser } from "../_shared/supabase.ts";

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
      purchaseToken?: unknown;
    };
    let purchaseToken = typeof body.purchaseToken === "string"
      ? body.purchaseToken.trim()
      : "";

    if (!purchaseToken) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("subscriptions")
        .select("provider,google_purchase_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.provider !== "google" || !data.google_purchase_token) {
        return jsonResponse({ active: false, billingPeriod: null });
      }
      purchaseToken = data.google_purchase_token;
    }

    const result = await syncGooglePlayPurchase(purchaseToken, user.id);
    return jsonResponse({
      active: result.active,
      billingPeriod: result.billingPeriod,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Google Play subscription verification failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
