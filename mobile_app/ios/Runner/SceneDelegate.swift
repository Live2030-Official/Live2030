import UIKit
import Flutter

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Attach Flutter window to the active UIWindowScene
        if let appDelegate = UIApplication.shared.delegate as? AppDelegate,
           let appWindow = appDelegate.window {
            appWindow.windowScene = windowScene
            self.window = appWindow
            self.window?.makeKeyAndVisible()
        } else if let window = self.window {
            window.windowScene = windowScene
            window.makeKeyAndVisible()
        }
    }

    func sceneDidDisconnect(_ scene: UIScene) {}

    func sceneDidBecomeActive(_ scene: UIScene) {}

    func sceneWillResignActive(_ scene: UIScene) {}

    func sceneWillEnterForeground(_ scene: UIScene) {}

    func sceneDidEnterBackground(_ scene: UIScene) {}
}
