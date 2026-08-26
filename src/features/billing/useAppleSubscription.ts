import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isNativeIOSApp } from "../../lib/nativePlatform";
import {
  APPLE_PRO_PRODUCT_IDS,
  APPLE_SESSION_PASS_PRODUCT_ID,
  addAppleTransactionListener,
  finishAppleTransaction,
  getAppleProducts,
  getAppleSessionPassProduct,
  getCurrentAppleEntitlements,
  purchaseAppleSessionPass,
  purchaseAppleSubscription,
  restoreApplePurchases,
  showAppleManageSubscriptions,
  type AppleBillingPeriod,
  type AppleProduct,
  type AppleTransaction,
} from "./applePurchases";
import { syncAppleSessionPass } from "./appleSessionPassSync";
import { syncAppleSubscription } from "./appleSubscriptionSync";

export function useAppleSubscription(session: Session | null) {
  const nativeIOS = isNativeIOSApp();
  const [products, setProducts] = useState<AppleProduct[]>([]);
  const [sessionPassProduct, setSessionPassProduct] =
    useState<AppleProduct | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(nativeIOS);
  const [isLoadingSessionPass, setIsLoadingSessionPass] = useState(nativeIOS);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [sessionPassError, setSessionPassError] = useState<string | null>(null);
  const syncingTransactionsRef = useRef(
    new Map<string, Promise<unknown>>(),
  );
  const userId = session?.user.id ?? null;

  const syncTransaction = useCallback((transaction: AppleTransaction) => {
    const pendingSync = syncingTransactionsRef.current.get(transaction.id);
    if (pendingSync) return pendingSync;

    const verification =
      transaction.productId === APPLE_SESSION_PASS_PRODUCT_ID
        ? syncAppleSessionPass(transaction)
        : syncAppleSubscription(transaction);
    const nextSync = verification
      .then(async (result) => {
        await finishAppleTransaction(transaction.id);
        return result;
      })
      .finally(() => {
        syncingTransactionsRef.current.delete(transaction.id);
      });
    syncingTransactionsRef.current.set(transaction.id, nextSync);
    return nextSync;
  }, []);

  const loadProducts = useCallback(async () => {
    if (!nativeIOS) {
      setProducts([]);
      setSessionPassProduct(null);
      setIsLoadingProducts(false);
      setIsLoadingSessionPass(false);
      setProductsError(null);
      setSessionPassError(null);
      return;
    }

    setIsLoadingProducts(true);
    setIsLoadingSessionPass(true);
    setProductsError(null);
    setSessionPassError(null);
    const [subscriptionsResult, sessionPassResult] = await Promise.allSettled([
      getAppleProducts(),
      getAppleSessionPassProduct(),
    ]);

    if (subscriptionsResult.status === "fulfilled") {
      const loadedProducts = subscriptionsResult.value.products;
      if (loadedProducts.length !== Object.keys(APPLE_PRO_PRODUCT_IDS).length) {
        setProducts([]);
        setProductsError(
          "Subscriptions are unavailable right now. Check your connection and try again.",
        );
      } else {
        setProducts(loadedProducts);
      }
    } else {
      setProducts([]);
      setProductsError(
        "Subscriptions are unavailable right now. Check your connection and try again.",
      );
    }

    if (sessionPassResult.status === "fulfilled") {
      const product = sessionPassResult.value.products.find(
        (candidate) => candidate.id === APPLE_SESSION_PASS_PRODUCT_ID,
      );
      setSessionPassProduct(product ?? null);
      setSessionPassError(
        product ? null : "The Session Pass is not available from the App Store yet.",
      );
    } else {
      setSessionPassProduct(null);
      setSessionPassError(
        "The Session Pass is unavailable right now. Try again later.",
      );
    }

    setIsLoadingProducts(false);
    setIsLoadingSessionPass(false);
  }, [nativeIOS]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!nativeIOS || !userId) return;

    let disposed = false;
    const listenerHandle = addAppleTransactionListener((transaction) => {
      if (!disposed) void syncTransaction(transaction).catch(() => undefined);
    });

    void getCurrentAppleEntitlements()
      .then(async ({ transactions }) => {
        if (disposed) return;
        if (transactions.length === 0) {
          await syncAppleSubscription().catch(() => undefined);
          return;
        }
        await Promise.allSettled(transactions.map(syncTransaction));
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      void listenerHandle.then((handle) => handle.remove());
    };
  }, [nativeIOS, syncTransaction, userId]);

  const productsByPeriod = useMemo(() => {
    const result: Partial<Record<AppleBillingPeriod, AppleProduct>> = {};
    for (const product of products) {
      if (product.id === APPLE_PRO_PRODUCT_IDS.monthly) {
        result.monthly = product;
      } else if (product.id === APPLE_PRO_PRODUCT_IDS.yearly) {
        result.yearly = product;
      }
    }
    return result;
  }, [products]);

  async function purchase(period: AppleBillingPeriod) {
    if (!userId) throw new Error("Sign in before starting a subscription.");
    const result = await purchaseAppleSubscription(period, userId);
    if (result.status !== "purchased") return result;
    await syncTransaction(result.transaction);
    return result;
  }

  async function purchaseSessionPass() {
    if (!userId) throw new Error("Sign in before buying a Session Pass.");
    const result = await purchaseAppleSessionPass(userId);
    if (result.status !== "purchased") return result;
    await syncTransaction(result.transaction);
    return result;
  }

  async function restore() {
    if (!userId) throw new Error("Sign in before restoring purchases.");
    const { transactions } = await restoreApplePurchases();
    if (transactions.length === 0) {
      const subscription = await syncAppleSubscription();
      return {
        active: subscription?.active ?? false,
        sessionPassActive: false,
      };
    }

    const results = await Promise.all(transactions.map(syncTransaction));
    const subscription = results.find(
      (result) =>
        !!result &&
        typeof result === "object" &&
        "billingPeriod" in result,
    ) as { active?: boolean } | undefined;
    const sessionPass = results.find(
      (result) =>
        !!result &&
        typeof result === "object" &&
        "sessionLimit" in result,
    ) as { active?: boolean } | undefined;
    return {
      active: subscription?.active ?? false,
      sessionPassActive: sessionPass?.active ?? false,
    };
  }

  return {
    isAvailable: nativeIOS,
    isLoadingProducts,
    isLoadingSessionPass,
    productsError,
    sessionPassError,
    sessionPassProduct,
    productsByPeriod,
    purchase,
    purchaseSessionPass,
    reloadProducts: loadProducts,
    restore,
    showManageSubscriptions: showAppleManageSubscriptions,
  };
}
