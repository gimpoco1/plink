import {
  decodeAppleJws,
  syncAppleSessionPassByTransaction,
  syncAppleSubscriptionByTransaction,
} from "../_shared/apple.ts";
import { jsonResponse } from "../_shared/cors.ts";
import { APPLE_SESSION_PASS_PRODUCT_ID } from "../_shared/session_pass.ts";

type NotificationPayload = {
  data?: {
    bundleId?: string;
    signedTransactionInfo?: string;
  };
  notificationType?: string;
};

type TransactionPayload = {
  productId?: string;
  transactionId?: string;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { signedPayload?: unknown };
    if (typeof body.signedPayload !== "string") {
      return jsonResponse({ error: "Missing signedPayload." }, { status: 400 });
    }

    const notification = decodeAppleJws<NotificationPayload>(
      body.signedPayload,
    );
    const signedTransaction = notification.data?.signedTransactionInfo;

    // TEST notifications contain no transaction and only verify delivery.
    if (!signedTransaction) {
      return jsonResponse({ received: true });
    }

    const transaction = decodeAppleJws<TransactionPayload>(signedTransaction);
    if (!transaction.transactionId) {
      return jsonResponse({ error: "Missing transaction ID." }, { status: 400 });
    }

    if (transaction.productId === APPLE_SESSION_PASS_PRODUCT_ID) {
      await syncAppleSessionPassByTransaction(transaction.transactionId);
    } else {
      await syncAppleSubscriptionByTransaction(transaction.transactionId);
    }
    return jsonResponse({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Notification handling failed.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
