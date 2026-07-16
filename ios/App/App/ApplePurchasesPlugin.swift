import Capacitor
import Foundation
import StoreKit

@objc(ApplePurchasesPlugin)
class ApplePurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ApplePurchasesPlugin"
    let jsName = "ApplePurchases"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showManageSubscriptions", returnType: CAPPluginReturnPromise)
    ]

    private let allowedProductIds: Set<String> = [
        "com.plinkscore.app.pro.monthly",
        "com.plinkscore.app.pro.yearly"
    ]
    private var transactionUpdatesTask: Task<Void, Never>?

    override func load() {
        transactionUpdatesTask = Task { [weak self] in
            for await verification in Transaction.updates {
                guard
                    let self,
                    let payload = self.verifiedTransactionPayload(verification)
                else { continue }
                self.notifyListeners("transactionUpdated", data: payload)
            }
        }
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let requestedIds = Set(call.getArray("productIds", String.self) ?? [])
        let productIds = requestedIds.intersection(allowedProductIds)
        guard !productIds.isEmpty else {
            call.reject("No valid Apple products were requested.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIds)
                    .sorted { $0.price < $1.price }
                call.resolve([
                    "products": products.map(productPayload)
                ])
            } catch {
                call.reject("The App Store products could not be loaded.", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard
            let productId = call.getString("productId"),
            allowedProductIds.contains(productId)
        else {
            call.reject("A valid Apple product is required.")
            return
        }
        guard
            let rawAccountToken = call.getString("appAccountToken"),
            let accountToken = UUID(uuidString: rawAccountToken)
        else {
            call.reject("A valid account is required before purchasing.")
            return
        }

        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("This subscription is not available from the App Store.")
                    return
                }

                let result = try await product.purchase(options: [
                    .appAccountToken(accountToken)
                ])
                switch result {
                case .success(let verification):
                    guard let payload = verifiedTransactionPayload(verification) else {
                        call.reject("Apple could not verify the completed purchase.")
                        return
                    }
                    call.resolve([
                        "status": "purchased",
                        "transaction": payload
                    ])
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.reject("The App Store returned an unknown purchase result.")
                }
            } catch {
                call.reject(purchaseErrorMessage(error), nil, error)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve([
                    "transactions": await currentEntitlementPayloads()
                ])
            } catch {
                call.reject("Your App Store purchases could not be restored.", nil, error)
            }
        }
    }

    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        Task {
            call.resolve([
                "transactions": await currentEntitlementPayloads()
            ])
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard
            let transactionId = call.getString("transactionId"),
            let numericId = UInt64(transactionId)
        else {
            call.reject("A valid Apple transaction is required.")
            return
        }

        Task {
            for await verification in Transaction.unfinished {
                guard case .verified(let transaction) = verification else { continue }
                if transaction.id == numericId {
                    await transaction.finish()
                    call.resolve()
                    return
                }
            }
            // A previously finished subscription is still a valid entitlement.
            call.resolve()
        }
    }

    @objc func showManageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let windowScene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Subscription settings are not available right now.")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: windowScene)
                call.resolve()
            } catch {
                call.reject("Subscription settings could not be opened.", nil, error)
            }
        }
    }

    private func currentEntitlementPayloads() async -> [[String: Any]] {
        var transactions: [[String: Any]] = []
        for await verification in Transaction.currentEntitlements {
            guard let payload = verifiedTransactionPayload(verification) else { continue }
            transactions.append(payload)
        }
        return transactions
    }

    private func verifiedTransactionPayload(
        _ verification: VerificationResult<Transaction>
    ) -> [String: Any]? {
        guard case .verified(let transaction) = verification else { return nil }
        guard allowedProductIds.contains(transaction.productID) else { return nil }
        return [
            "id": String(transaction.id),
            "originalId": String(transaction.originalID),
            "productId": transaction.productID,
            "signedTransaction": verification.jwsRepresentation
        ]
    }

    private func productPayload(_ product: Product) -> [String: Any] {
        var periodPayload: [String: Any]?
        if let period = product.subscription?.subscriptionPeriod {
            periodPayload = [
                "unit": subscriptionPeriodUnit(period.unit),
                "value": period.value
            ]
        }

        return [
            "id": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "price": NSDecimalNumber(decimal: product.price).stringValue,
            "subscriptionPeriod": periodPayload as Any
        ]
    }

    private func subscriptionPeriodUnit(
        _ unit: Product.SubscriptionPeriod.Unit
    ) -> String {
        switch unit {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "month"
        }
    }

    private func purchaseErrorMessage(_ error: Error) -> String {
        if let storeKitError = error as? StoreKitError {
            switch storeKitError {
            case .networkError:
                return "Connect to the internet and try the purchase again."
            case .notAvailableInStorefront:
                return "This subscription is not available in your App Store region."
            case .notEntitled:
                return "This Apple Account is not allowed to make this purchase."
            default:
                break
            }
        }
        return "The purchase could not be completed. Please try again."
    }
}
