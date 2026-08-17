import UIKit
import Capacitor
import CoreLocation
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // ---------------------------------------------------------------------------
    // Boot-level CLLocationManager — must be created SYNCHRONOUSLY on the main
    // thread in didFinishLaunchingWithOptions so its delegate is alive before iOS
    // fires any pending geofence callbacks (enter/exit) after a background
    // relaunch or force-close recovery.  Capacitor's plugin.load() runs on the
    // main queue AFTER this method returns, so the plugin's own CLLocationManager
    // may not have its delegate set yet when the first OS callback fires.
    // This AppDelegate-level manager catches those early callbacks and forwards
    // them to the plugin's shared UserDefaults-backed HTTP ping, guaranteeing
    // no geofence event is ever dropped.
    // ---------------------------------------------------------------------------
    private var bootLocationManager: CLLocationManager?
    private var bootGeofenceDelegate: BootGeofenceDelegate?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase first (unchanged).
        FirebaseApp.configure()

        // ── Geofence boot-path ────────────────────────────────────────────────
        // iOS sets UIApplicationLaunchOptionsLocationKey when it relaunch-wakes
        // the app due to a region-monitoring event (including after force-close).
        // Spin up a lightweight CLLocationManager immediately so the delegate
        // is registered before Capacitor finishes loading its plugin stack.
        if launchOptions?[.location] != nil {
            print("🌍 AppDelegate: App relaunched by iOS geofence event — booting CLLocationManager immediately.")
            bootGeofenceDelegate = BootGeofenceDelegate()
            bootLocationManager = CLLocationManager()
            bootLocationManager?.delegate = bootGeofenceDelegate
        }

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

// MARK: - BootGeofenceDelegate

/// Lightweight CLLocationManagerDelegate used exclusively at app-boot time when
/// iOS relaunches the app for a geofence event.  It reads the persisted server
/// URL and token from UserDefaults (written by CampusGeofencePlugin at
/// registration time) and POSTs the event directly to Django — the same path
/// that CampusGeofencePlugin uses — so the principal radar is always updated
/// even if Capacitor hasn't finished loading its plugin stack yet.
class BootGeofenceDelegate: NSObject, CLLocationManagerDelegate {

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region.identifier.contains("CAMPUS_GEOFENCE") else { return }
        print("🌍 BootGeofenceDelegate: ENTER event for \(region.identifier)")
        sendBootPing(event: "ENTER", region: region, manager: manager)
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard region.identifier.contains("CAMPUS_GEOFENCE") else { return }
        print("🌍 BootGeofenceDelegate: EXIT event for \(region.identifier)")
        sendBootPing(event: "EXIT", region: region, manager: manager)
    }

    func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
        print("⚠️ BootGeofenceDelegate: Monitoring failed — \(error.localizedDescription)")
    }

    private func sendBootPing(event: String, region: CLRegion, manager: CLLocationManager) {
        let defaults = UserDefaults.standard
        guard
            let urlStr = defaults.string(forKey: "StalightCampusGeofenceServerUrl"),
            !urlStr.isEmpty,
            let url = URL(string: urlStr)
        else {
            print("⚠️ BootGeofenceDelegate: No server URL in UserDefaults — cannot send ping.")
            return
        }
        let authToken = defaults.string(forKey: "StalightCampusGeofenceAuthToken") ?? ""

        // Use the triggering location if available; fall back to region centre.
        let location = manager.location
        let lat = location?.coordinate.latitude  ?? (region as? CLCircularRegion)?.center.latitude  ?? 0.0
        let lng = location?.coordinate.longitude ?? (region as? CLCircularRegion)?.center.longitude ?? 0.0

        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask(withName: "StalightBootGeofencePing") {
            UIApplication.shared.endBackgroundTask(bgTask)
            bgTask = .invalid
        }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 8.0)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !authToken.isEmpty {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = ["event": event, "latitude": lat, "longitude": lng]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("❌ BootGeofenceDelegate ping error: \(error.localizedDescription)")
            } else if let http = response as? HTTPURLResponse {
                print("✅ BootGeofenceDelegate ping sent (\(event)) — HTTP \(http.statusCode)")
            }
            if bgTask != .invalid {
                UIApplication.shared.endBackgroundTask(bgTask)
                bgTask = .invalid
            }
        }.resume()
    }
}
