import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  getRequiredEnv,
  normalizeAppOrigin,
  requireUser,
  stripe,
} from "../_shared/stripe.ts";
import { STRIPE_SESSION_PASS_PRODUCT_KEY } from "../_shared/session_pass.ts";

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
      origin?: unknown;
    };
    const origin = normalizeAppOrigin(body.origin);
    if (!origin) {
      return jsonResponse(
        { error: "A valid app origin is required." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existingPurchase, error: existingError } = await admin
      .from("session_pass_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingPurchase) {
      return jsonResponse(
        { error: "This account already has a Session Pass." },
        { status: 409 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/?session_pass=success`,
      cancel_url: `${origin}/?session_pass=cancelled`,
      line_items: [
        {
          price: getRequiredEnv("STRIPE_PRICE_SESSION_PASS_100"),
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        product: STRIPE_SESSION_PASS_PRODUCT_KEY,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          product: STRIPE_SESSION_PASS_PRODUCT_KEY,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    return jsonResponse({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Session Pass checkout is unavailable.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
