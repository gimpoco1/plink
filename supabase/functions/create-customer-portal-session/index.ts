import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createAdminClient,
  normalizeAppOrigin,
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
    const body = (await request.json()) as { origin?: string };
    const origin = normalizeAppOrigin(body.origin);

    if (!origin) {
      return jsonResponse(
        { error: "A valid app origin is required." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.customer_id) {
      return jsonResponse(
        { error: "No Stripe billing profile was found for this account yet." },
        { status: 404 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer_id,
      return_url: `${origin}/?billing=return`,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create billing portal session.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
