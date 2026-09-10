import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isNativeAndroidApp } from "../../lib/nativePlatform";
import {
  GOOGLE_PLAY_PRO_BASE_PLAN_IDS,
  addGooglePlayPurchaseListener,
  getCurrentGooglePlayPurchases,
  getGooglePlayProducts,
  purchaseGooglePlaySubscription,
  showGooglePlayManageSubscriptions,
  type GooglePlayBillingPeriod,
  type GooglePlayProduct,
} from "./googlePlayPurchases";
import { syncGooglePlaySubscription } from "./googlePlaySubscriptionSync";

async function hashAccountId(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function useGooglePlaySubscription(session: Session | null) {
  const nativeAndroid = isNativeAndroidApp();
  const [products, setProducts] = useState<GooglePlayProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(nativeAndroid);
  const [productsError, setProductsError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  const loadProducts = useCallback(async () => {
    if (!nativeAndroid) {
      setProducts([]);
      setIsLoadingProducts(false);
      setProductsError(null);
      return;
    }

    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const result = await getGooglePlayProducts();
      const product = result.products[0];
      const availableBasePlanIds = new Set(
        product?.basePlans.map((plan) => plan.basePlanId) ?? [],
      );
      const hasEveryBasePlan = Object.values(
        GOOGLE_PLAY_PRO_BASE_PLAN_IDS,
      ).every((basePlanId) => availableBasePlanIds.has(basePlanId));

      if (!product || !hasEveryBasePlan) {
        throw new Error("The configured subscription plans were not returned.");
      }
      setProducts(result.products);
    } catch {
      setProducts([]);
      setProductsError(
        "Subscriptions are unavailable right now. Check your connection and try again.",
      );
    } finally {
      setIsLoadingProducts(false);
    }
  }, [nativeAndroid]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!nativeAndroid || !userId) return;

    let disposed = false;
    const listenerHandle = addGooglePlayPurchaseListener((purchase) => {
      if (!disposed && purchase.productId === "plink_pro") {
        void syncGooglePlaySubscription(purchase.purchaseToken).catch(
          () => undefined,
        );
      }
    });

    void getCurrentGooglePlayPurchases()
      .then(async ({ purchases }) => {
        const purchase = purchases.find(
          (candidate) => candidate.productId === "plink_pro",
        );
        await syncGooglePlaySubscription(purchase?.purchaseToken);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      void listenerHandle.then((handle) => handle.remove());
    };
  }, [nativeAndroid, userId]);

  const productsByPeriod = useMemo(() => {
    const product = products[0];
    if (!product) return {};

    const result: Partial<
      Record<GooglePlayBillingPeriod, GooglePlayProduct["basePlans"][number]>
    > = {};
    for (const period of Object.keys(
      GOOGLE_PLAY_PRO_BASE_PLAN_IDS,
    ) as GooglePlayBillingPeriod[]) {
      result[period] = product.basePlans.find(
        (plan) => plan.basePlanId === GOOGLE_PLAY_PRO_BASE_PLAN_IDS[period],
      );
    }
    return result;
  }, [products]);

  async function purchase(period: GooglePlayBillingPeriod) {
    if (!userId) throw new Error("Sign in before starting a subscription.");
    const obfuscatedAccountId = await hashAccountId(userId);
    const result = await purchaseGooglePlaySubscription(
      period,
      obfuscatedAccountId,
    );
    if (result.status !== "purchased") return result;
    await syncGooglePlaySubscription(result.purchase.purchaseToken);
    return result;
  }

  async function restore() {
    if (!userId) throw new Error("Sign in before restoring purchases.");
    const { purchases } = await getCurrentGooglePlayPurchases();
    const purchase = purchases.find(
      (candidate) => candidate.productId === "plink_pro",
    );
    const subscription = await syncGooglePlaySubscription(
      purchase?.purchaseToken,
    );
    return { active: subscription?.active ?? false };
  }

  return {
    isAvailable: nativeAndroid,
    isLoadingProducts,
    productsError,
    productsByPeriod,
    purchase,
    reloadProducts: loadProducts,
    restore,
    showManageSubscriptions: showGooglePlayManageSubscriptions,
  };
}
