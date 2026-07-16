import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const APPLE_PRO_PRODUCT_IDS = {
  monthly: "com.plinkscore.app.pro.monthly",
  yearly: "com.plinkscore.app.pro.yearly",
} as const;

export type AppleBillingPeriod = keyof typeof APPLE_PRO_PRODUCT_IDS;

export type AppleProduct = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: string;
  subscriptionPeriod: {
    unit: "day" | "week" | "month" | "year";
    value: number;
  } | null;
};

export type AppleTransaction = {
  id: string;
  originalId: string;
  productId: string;
  signedTransaction: string;
};

type ApplePurchaseResult =
  | { status: "purchased"; transaction: AppleTransaction }
  | { status: "pending" | "cancelled" };

type ApplePurchasesPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{
    products: AppleProduct[];
  }>;
  purchase(options: {
    productId: string;
    appAccountToken: string;
  }): Promise<ApplePurchaseResult>;
  restorePurchases(): Promise<{ transactions: AppleTransaction[] }>;
  getCurrentEntitlements(): Promise<{ transactions: AppleTransaction[] }>;
  finishTransaction(options: { transactionId: string }): Promise<void>;
  showManageSubscriptions(): Promise<void>;
  addListener(
    eventName: "transactionUpdated",
    listener: (transaction: AppleTransaction) => void,
  ): Promise<PluginListenerHandle>;
};

const ApplePurchases = registerPlugin<ApplePurchasesPlugin>("ApplePurchases");

export function getAppleProducts() {
  return ApplePurchases.getProducts({
    productIds: Object.values(APPLE_PRO_PRODUCT_IDS),
  });
}

export function purchaseAppleSubscription(
  billingPeriod: AppleBillingPeriod,
  appAccountToken: string,
) {
  return ApplePurchases.purchase({
    productId: APPLE_PRO_PRODUCT_IDS[billingPeriod],
    appAccountToken,
  });
}

export function restoreApplePurchases() {
  return ApplePurchases.restorePurchases();
}

export function getCurrentAppleEntitlements() {
  return ApplePurchases.getCurrentEntitlements();
}

export function finishAppleTransaction(transactionId: string) {
  return ApplePurchases.finishTransaction({ transactionId });
}

export function showAppleManageSubscriptions() {
  return ApplePurchases.showManageSubscriptions();
}

export function addAppleTransactionListener(
  listener: (transaction: AppleTransaction) => void,
) {
  return ApplePurchases.addListener("transactionUpdated", listener);
}
