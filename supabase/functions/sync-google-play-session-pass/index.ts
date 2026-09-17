import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { syncGooglePlaySessionPass } from "../_shared/google-play.ts";
import { requireUser } from "../_shared/supabase.ts";

type RequestBody = {
  purchaseToken?: unknown;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const user = await requireUser(request.headers.get("Authorization"));
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    if (typeof body.purchaseToken !== "string") {
      throw new Error("A Google Play purchase token is required.");
    }

    const result = await syncGooglePlaySessionPass(
      body.purchaseToken,
      user.id,
    );
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Google Play Session Pass verification failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
