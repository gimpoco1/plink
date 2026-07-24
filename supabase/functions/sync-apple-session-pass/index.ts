import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { syncAppleSessionPassByTransaction } from "../_shared/apple.ts";
import { requireUser } from "../_shared/supabase.ts";

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
    const transactionId =
      typeof body.transactionId === "string"
        ? body.transactionId.trim()
        : "";
    if (!transactionId) {
      return jsonResponse(
        { error: "A valid Apple transaction is required." },
        { status: 400 },
      );
    }

    const result = await syncAppleSessionPassByTransaction(
      transactionId,
      user.id,
    );
    return jsonResponse(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Apple Session Pass verification failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
