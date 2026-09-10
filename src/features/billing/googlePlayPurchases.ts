import {
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";

export const GOOGLE_PLAY_PRO_PRODUCT_ID = "plink_pro";
export const GOOGLE_PLAY_PRO_BASE_PLAN_IDS = {
  monthly: "monthly-auto",
  yearly: "yearly",
} as const;

export type GooglePlayBillingPeriod =
  keyof typeof GOOGLE_PLAY_PRO_BASE_PLAN_IDS;

export type GooglePlayBasePlan = {
  basePlanId: string;
  offerToken: string;
  displayPrice: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  billingPeriod: string;
};

export type GooglePlayProduct = {
  id: string;
  displayName: string;
  description: string;
  basePlans: GooglePlayBasePlan[];
};

export type GooglePlayPurchase = {
  productId: string;
  purchaseToken: string;
  orderId: string | null;
  purchasedAt: number;
  acknowledged: boolean;
  autoRenewing: boolean;
};

type GooglePlayPurchaseResult =
  | { status: "purchased"; purchase: GooglePlayPurchase }
  | { status: "pending" | "cancelled" };

type GooglePlayBillingPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{
    products: GooglePlayProduct[];
  }>;
  purchase(options: {
    productId: string;
    basePlanId: string;
    obfuscatedAccountId: string;
  }): Promise<GooglePlayPurchaseResult>;
  getCurrentPurchases(): Promise<{ purchases: GooglePlayPurchase[] }>;
  showManageSubscriptions(options: { productId: string }): Promise<void>;
  addListener(
    eventName: "purchaseUpdated",
    listener: (purchase: GooglePlayPurchase) => void,
  ): Promise<PluginListenerHandle>;
};

const GooglePlayBilling = registerPlugin<GooglePlayBillingPlugin>(
  "GooglePlayBilling",
);

export function getGooglePlayProducts() {
  return GooglePlayBilling.getProducts({
    productIds: [GOOGLE_PLAY_PRO_PRODUCT_ID],
  });
}

export function purchaseGooglePlaySubscription(
  billingPeriod: GooglePlayBillingPeriod,
  obfuscatedAccountId: string,
) {
  return GooglePlayBilling.purchase({
    productId: GOOGLE_PLAY_PRO_PRODUCT_ID,
    basePlanId: GOOGLE_PLAY_PRO_BASE_PLAN_IDS[billingPeriod],
    obfuscatedAccountId,
  });
}

export function getCurrentGooglePlayPurchases() {
  return GooglePlayBilling.getCurrentPurchases();
}

export function showGooglePlayManageSubscriptions() {
  return GooglePlayBilling.showManageSubscriptions({
    productId: GOOGLE_PLAY_PRO_PRODUCT_ID,
  });
}

export function addGooglePlayPurchaseListener(
  listener: (purchase: GooglePlayPurchase) => void,
) {
  return GooglePlayBilling.addListener("purchaseUpdated", listener);
}
