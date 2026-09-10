package com.plinkscore.app;

import android.content.Intent;
import android.net.Uri;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String PRO_PRODUCT_ID = "plink_pro";
    private static final List<String> ALLOWED_BASE_PLAN_IDS = List.of("monthly-auto", "yearly");

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private final List<ReadyOperation> pendingReadyOperations = new ArrayList<>();
    private boolean isConnecting;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enableAutoServiceReconnection()
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) billingClient.endConnection();
        synchronized (this) {
            for (ReadyOperation operation : pendingReadyOperations) {
                operation.call.reject("Google Play Billing was interrupted.");
            }
            pendingReadyOperations.clear();
            isConnecting = false;
        }
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject("The purchase was interrupted.");
            pendingPurchaseCall = null;
        }
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray requestedIds = call.getArray("productIds");
        if (requestedIds == null || !arrayContains(requestedIds, PRO_PRODUCT_ID)) {
            call.reject("No valid Google Play products were requested.");
            return;
        }

        withReady(call, () -> queryProduct(call, product -> {
            JSObject result = new JSObject();
            JSArray products = new JSArray();
            products.put(productPayload(product));
            result.put("products", products);
            call.resolve(result);
        }));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        String basePlanId = call.getString("basePlanId");
        String obfuscatedAccountId = call.getString("obfuscatedAccountId");
        if (!PRO_PRODUCT_ID.equals(productId) || !ALLOWED_BASE_PLAN_IDS.contains(basePlanId)) {
            call.reject("A valid Google Play subscription plan is required.");
            return;
        }
        if (obfuscatedAccountId == null || !obfuscatedAccountId.matches("^[a-f0-9]{64}$")) {
            call.reject("A valid account is required before purchasing.");
            return;
        }
        if (pendingPurchaseCall != null) {
            call.reject("Another purchase is already in progress.");
            return;
        }

        withReady(call, () -> queryProduct(call, product -> {
            ProductDetails.SubscriptionOfferDetails offer = findBasePlanOffer(product, basePlanId);
            if (offer == null) {
                call.reject("This subscription plan is not available from Google Play.");
                return;
            }

            BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams
                .newBuilder()
                .setProductDetails(product)
                .setOfferToken(offer.getOfferToken())
                .build();
            BillingFlowParams flowParams = BillingFlowParams
                .newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams))
                .setObfuscatedAccountId(obfuscatedAccountId)
                .build();

            pendingPurchaseCall = call;
            BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                call.reject(billingError("Google Play could not start the purchase", result));
            }
        }));
    }

    @PluginMethod
    public void getCurrentPurchases(PluginCall call) {
        withReady(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams
                .newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            billingClient.queryPurchasesAsync(params, (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingError("Google Play purchases could not be loaded", result));
                    return;
                }
                JSObject payload = new JSObject();
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getProducts().contains(PRO_PRODUCT_ID)) {
                        items.put(purchasePayload(purchase));
                    }
                }
                payload.put("purchases", items);
                call.resolve(payload);
            });
        });
    }

    @PluginMethod
    public void showManageSubscriptions(PluginCall call) {
        String productId = call.getString("productId");
        if (!PRO_PRODUCT_ID.equals(productId)) {
            call.reject("A valid Google Play subscription is required.");
            return;
        }
        Uri uri = Uri.parse(
            "https://play.google.com/store/account/subscriptions?sku=" +
            Uri.encode(productId) +
            "&package=" +
            Uri.encode(getContext().getPackageName())
        );
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;

        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (call != null) call.resolve(new JSObject().put("status", "cancelled"));
            return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            if (call != null) {
                call.reject(billingError("Google Play could not complete the purchase", result));
            }
            return;
        }

        Purchase purchase = purchases
            .stream()
            .filter(item -> item.getProducts().contains(PRO_PRODUCT_ID))
            .findFirst()
            .orElse(null);
        if (purchase == null) {
            if (call != null) {
                call.reject("Google Play did not return the Plink Pro purchase.");
            }
        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            if (call != null) call.resolve(new JSObject().put("status", "pending"));
        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            JSObject payload = purchasePayload(purchase);
            if (call != null) {
                call.resolve(
                    new JSObject()
                        .put("status", "purchased")
                        .put("purchase", payload)
                );
            } else {
                notifyListeners("purchaseUpdated", payload);
            }
        } else {
            if (call != null) {
                call.reject("Google Play returned an unknown purchase state.");
            }
        }
    }

    private synchronized void withReady(PluginCall call, Runnable action) {
        if (billingClient.isReady()) {
            action.run();
            return;
        }
        pendingReadyOperations.add(new ReadyOperation(call, action));
        if (isConnecting) return;
        isConnecting = true;

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                List<ReadyOperation> operations;
                synchronized (GooglePlayBillingPlugin.this) {
                    isConnecting = false;
                    operations = new ArrayList<>(pendingReadyOperations);
                    pendingReadyOperations.clear();
                }
                for (ReadyOperation operation : operations) {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        operation.action.run();
                    } else {
                        operation.call.reject(
                            billingError("Google Play Billing is unavailable", result)
                        );
                    }
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                List<ReadyOperation> operations;
                synchronized (GooglePlayBillingPlugin.this) {
                    isConnecting = false;
                    operations = new ArrayList<>(pendingReadyOperations);
                    pendingReadyOperations.clear();
                }
                for (ReadyOperation operation : operations) {
                    operation.call.reject(
                        "Google Play Billing disconnected. Check your connection and try again."
                    );
                }
            }
        });
    }

    private void queryProduct(PluginCall call, ProductCallback callback) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product
            .newBuilder()
            .setProductId(PRO_PRODUCT_ID)
            .setProductType(BillingClient.ProductType.SUBS)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams
            .newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();
        billingClient.queryProductDetailsAsync(params, (result, queryResult) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(billingError("Google Play subscriptions could not be loaded", result));
                return;
            }
            ProductDetails details = queryResult
                .getProductDetailsList()
                .stream()
                .filter(item -> PRO_PRODUCT_ID.equals(item.getProductId()))
                .findFirst()
                .orElse(null);
            if (details == null) {
                call.reject("Plink Pro is not available from Google Play for this account.");
                return;
            }
            callback.onProduct(details);
        });
    }

    private ProductDetails.SubscriptionOfferDetails findBasePlanOffer(
        ProductDetails product,
        String basePlanId
    ) {
        List<ProductDetails.SubscriptionOfferDetails> offers = product.getSubscriptionOfferDetails();
        if (offers == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (!basePlanId.equals(offer.getBasePlanId())) continue;
            if (offer.getOfferId() == null) return offer;
        }
        return null;
    }

    private JSObject productPayload(ProductDetails product) {
        JSObject payload = new JSObject();
        payload.put("id", product.getProductId());
        payload.put("displayName", product.getName());
        payload.put("description", product.getDescription());
        JSArray basePlans = new JSArray();
        List<ProductDetails.SubscriptionOfferDetails> offers = product.getSubscriptionOfferDetails();
        if (offers != null) {
            for (String basePlanId : ALLOWED_BASE_PLAN_IDS) {
                ProductDetails.SubscriptionOfferDetails offer = findBasePlanOffer(product, basePlanId);
                if (offer == null) continue;
                List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                if (phases.isEmpty()) continue;
                ProductDetails.PricingPhase recurringPhase = phases.get(phases.size() - 1);
                basePlans.put(
                    new JSObject()
                        .put("basePlanId", basePlanId)
                        .put("offerToken", offer.getOfferToken())
                        .put("displayPrice", recurringPhase.getFormattedPrice())
                        .put("priceAmountMicros", recurringPhase.getPriceAmountMicros())
                        .put("priceCurrencyCode", recurringPhase.getPriceCurrencyCode())
                        .put("billingPeriod", recurringPhase.getBillingPeriod())
                );
            }
        }
        payload.put("basePlans", basePlans);
        return payload;
    }

    private JSObject purchasePayload(Purchase purchase) {
        String orderId = purchase.getOrderId();
        return new JSObject()
            .put("productId", PRO_PRODUCT_ID)
            .put("purchaseToken", purchase.getPurchaseToken())
            .put("orderId", orderId == null ? JSObject.NULL : orderId)
            .put("purchasedAt", purchase.getPurchaseTime())
            .put("acknowledged", purchase.isAcknowledged())
            .put("autoRenewing", purchase.isAutoRenewing());
    }

    private boolean arrayContains(JSArray values, String expected) {
        for (int index = 0; index < values.length(); index++) {
            if (expected.equals(values.optString(index))) return true;
        }
        return false;
    }

    private String billingError(String message, BillingResult result) {
        String detail = result.getDebugMessage();
        return detail == null || detail.isBlank() ? message + "." : message + ": " + detail;
    }

    private interface ProductCallback {
        void onProduct(ProductDetails product);
    }

    private static class ReadyOperation {
        final PluginCall call;
        final Runnable action;

        ReadyOperation(PluginCall call, Runnable action) {
            this.call = call;
            this.action = action;
        }
    }
}
