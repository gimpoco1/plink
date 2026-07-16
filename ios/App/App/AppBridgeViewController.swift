import Capacitor

@objc(AppBridgeViewController)
class AppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ApplePurchasesPlugin())
    }
}
