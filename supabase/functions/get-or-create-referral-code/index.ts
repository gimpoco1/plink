import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, requireUser } from "../_shared/stripe.ts";

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
    const { data: existingCode, error: existingCodeError } = await admin
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (existingCodeError) throw existingCodeError;
    if (!existingCode?.code) {
      return jsonResponse(
        { error: "No referral code is configured for this account." },
        { status: 404 },
      );
    }

    return jsonResponse({ code: existingCode.code });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load referral code.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
