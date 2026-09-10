import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.3";
import { jsonResponse } from "../_shared/cors.ts";
import { syncGooglePlayPurchase } from "../_shared/google-play.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const PACKAGE_NAME = "com.plinkscore.app";

type PubSubEnvelope = {
  message?: {
    data?: string;
  };
};

type DeveloperNotification = {
  packageName?: string;
  subscriptionNotification?: {
    purchaseToken?: string;
  };
  testNotification?: Record<string, unknown>;
};

async function requireGooglePushIdentity(request: Request) {
  const audience = Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE");
  const expectedEmail = Deno.env.get(
    "GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL",
  );
  if (!audience || !expectedEmail) {
    throw new Error("Google Play notifications are not configured.");
  }

  const header = request.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Missing Google push authorization.");

  const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
    audience,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (payload.email !== expectedEmail || payload.email_verified !== true) {
    throw new Error("Invalid Google push identity.");
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    await requireGooglePushIdentity(request);
    const envelope = (await request.json()) as PubSubEnvelope;
    if (!envelope.message?.data) {
      throw new Error("Missing Google Play notification data.");
    }
    const notification = JSON.parse(
      atob(envelope.message.data),
    ) as DeveloperNotification;
    if (notification.packageName !== PACKAGE_NAME) {
      throw new Error("The notification is for a different application.");
    }

    const purchaseToken = notification.subscriptionNotification?.purchaseToken
      ?.trim();
    if (!purchaseToken) {
      return jsonResponse({ ok: true });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("google_purchase_token", purchaseToken)
      .maybeSingle();
    if (error) throw error;
    if (!data?.user_id) {
      // A new-purchase notification can arrive before the client associates the
      // token with its signed-in Plink account. The authenticated client sync
      // handles that first association.
      return jsonResponse({ ok: true });
    }

    await syncGooglePlayPurchase(purchaseToken, data.user_id);
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Google Play notification processing failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
