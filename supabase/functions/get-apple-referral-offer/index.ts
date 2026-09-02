import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, requireUser } from "../_shared/supabase.ts";

const PRODUCT_BY_PERIOD = {
  monthly: "com.plinkscore.app.pro.monthly",
  yearly: "com.plinkscore.app.pro.yearly",
} as const;

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
      code?: unknown;
      billingPeriod?: unknown;
    };
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const billingPeriod =
      body.billingPeriod === "monthly" || body.billingPeriod === "yearly"
        ? body.billingPeriod
        : null;

    if (!code || !billingPeriod) {
      return jsonResponse(
        { error: "Enter a valid referral code and billing period." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: referralCode, error: referralError } = await admin
      .from("referral_codes")
      .select("id,owner_user_id,discount_percent,active")
      .eq("code", code)
      .maybeSingle();
    if (referralError) throw referralError;
    if (!referralCode?.active) {
      return jsonResponse(
        { error: "This referral code is not valid." },
        {
          status: 404,
        },
      );
    }
    if (referralCode.owner_user_id === user.id) {
      return jsonResponse(
        { error: "You cannot use your own referral code." },
        {
          status: 400,
        },
      );
    }

    const { data: offer, error: offerError } = await admin
      .from("apple_referral_offers")
      .select("id,redemption_url")
      .eq("referral_code_id", referralCode.id)
      .eq("apple_product_id", PRODUCT_BY_PERIOD[billingPeriod])
      .eq("active", true)
      .maybeSingle();
    if (offerError) throw offerError;
    if (!offer) {
      return jsonResponse(
        { error: "This referral code is not available for that Apple plan." },
        { status: 404 },
      );
    }

    const { error: intentError } = await admin
      .from("apple_referral_redemption_intents")
      .insert({
        user_id: user.id,
        apple_referral_offer_id: offer.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    if (intentError) throw intentError;

    const discountPercent = Number(referralCode.discount_percent);
    if (!Number.isFinite(discountPercent)) {
      throw new Error("The referral discount is not configured correctly.");
    }

    return jsonResponse({
      url: offer.redemption_url,
      discountPercent,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The Apple referral offer could not be opened.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
