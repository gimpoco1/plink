import UIKit
import ActivityKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func sceneDidBecomeActive(_ scene: UIScene) {
        guard #available(iOS 17.0, *) else { return }
        Task {
            for activity in Activity<PlinkScoreActivityAttributes>.activities where activity.content.state.isFinished {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
