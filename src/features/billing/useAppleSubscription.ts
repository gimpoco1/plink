import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isNativeIOSApp } from "../../lib/nativePlatform";
import {
  APPLE_PRO_PRODUCT_IDS,
  addAppleTransactionListener,
  finishAppleTransaction,
  getAppleProducts,
  getCurrentAppleEntitlements,
  purchaseAppleSubscription,
  restoreApplePurchases,
  showAppleManageSubscriptions,
  type AppleBillingPeriod,
  type AppleProduct,
  type AppleTransaction,
} from "./applePurchases";
import { syncAppleSubscription } from "./appleSubscriptionSync";

export function useAppleSubscription(session: Session | null) {
  const nativeIOS = isNativeIOSApp();
  const [products, setProducts] = useState<AppleProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(nativeIOS);
  const [productsError, setProductsError] = useState<string | null>(null);
  const syncingTransactionsRef = useRef(
    new Map<string, ReturnType<typeof syncAppleSubscription>>(),
  );
  const userId = session?.user.id ?? null;

  const syncTransaction = useCallback((transaction: AppleTransaction) => {
    const pendingSync = syncingTransactionsRef.current.get(transaction.id);
    if (pendingSync) return pendingSync;

    const nextSync = syncAppleSubscription(transaction)
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
      setIsLoadingProducts(false);
      setProductsError(null);
      return;
    }

    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const { products: loadedProducts } = await getAppleProducts();
      if (loadedProducts.length !== Object.keys(APPLE_PRO_PRODUCT_IDS).length) {
        throw new Error("Some App Store subscriptions are unavailable.");
      }
      setProducts(loadedProducts);
    } catch {
      setProducts([]);
      setProductsError(
        "Subscriptions are unavailable right now. Check your connection and try again.",
      );
    } finally {
      setIsLoadingProducts(false);
    }
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

  async function restore() {
    if (!userId) throw new Error("Sign in before restoring purchases.");
    const { transactions } = await restoreApplePurchases();
    if (transactions.length === 0) {
      return syncAppleSubscription();
    }

    const results = await Promise.all(transactions.map(syncTransaction));
    return results.find((result) => result?.active) ?? results[0] ?? null;
  }

  return {
    isAvailable: nativeIOS,
    isLoadingProducts,
    productsError,
    productsByPeriod,
    purchase,
    reloadProducts: loadProducts,
    restore,
    showManageSubscriptions: showAppleManageSubscriptions,
  };
}
