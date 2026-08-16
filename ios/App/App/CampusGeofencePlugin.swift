import Foundation
import UIKit
import Capacitor
import CoreLocation

@objc(CampusGeofencePlugin)
public class CampusGeofencePlugin: CAPPlugin, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var serverUrl: String?
    private var authToken: String?

    override public func load() {
        super.load()
        DispatchQueue.main.async {
            self.locationManager = CLLocationManager()
            self.locationManager?.delegate = self
        }
    }

    @objc func requestGeofencePermissions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let lm = self.locationManager else {
                call.resolve(["granted": false])
                return
            }
            let status = CLLocationManager.authorizationStatus()
            if status == .notDetermined {
                lm.requestAlwaysAuthorization()
            }
            call.resolve(["granted": status == .authorizedAlways || status == .authorizedWhenInUse])
        }
    }

    @objc func addGeofence(_ call: CAPPluginCall) {
        guard let latitude = call.getDouble("latitude"),
              let longitude = call.getDouble("longitude") else {
            call.reject("Latitude and Longitude are required.")
            return
        }

        let radius = call.getDouble("radius") ?? 500.0
        let campusId = call.getString("campusId") ?? "DEFAULT_CAMPUS"
        self.serverUrl = call.getString("serverUrl")
        self.authToken = call.getString("authToken")

        UserDefaults.standard.set(self.serverUrl, forKey: "StalightCampusGeofenceServerUrl")
        UserDefaults.standard.set(self.authToken, forKey: "StalightCampusGeofenceAuthToken")
        UserDefaults.standard.synchronize()

        DispatchQueue.main.async {
            guard let lm = self.locationManager else {
                call.reject("LocationManager not initialized")
                return
            }

            if CLLocationManager.authorizationStatus() == .notDetermined {
                lm.requestAlwaysAuthorization()
            }

            if CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) {
                let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
                let region = CLCircularRegion(center: center, radius: radius, identifier: "CAMPUS_GEOFENCE_" + campusId)
                region.notifyOnEntry = true
                region.notifyOnExit = true

                lm.startMonitoring(for: region)
                print("✅ Native iOS CoreLocation Geofence (CLCircularRegion) registered for \(campusId)")
                call.resolve(["success": true])
            } else {
                call.reject("Region monitoring is not available on this iOS device.")
            }
        }
    }

    @objc func removeGeofences(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let lm = self.locationManager else {
                call.resolve(["success": true])
                return
            }
            for region in lm.monitoredRegions {
                if region.identifier.contains("CAMPUS_GEOFENCE") {
                    lm.stopMonitoring(for: region)
                }
            }
            call.resolve(["success": true])
        }
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        print("📍 Native iOS Geofence Event: ENTER region \(region.identifier)")
        sendGeofencePing(event: "ENTER", region: region)
    }

    public func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        print("📍 Native iOS Geofence Event: EXIT region \(region.identifier)")
        sendGeofencePing(event: "EXIT", region: region)
    }

    private func sendGeofencePing(event: String, region: CLRegion) {
        let savedServerUrl = UserDefaults.standard.string(forKey: "StalightCampusGeofenceServerUrl")
        let savedAuthToken = UserDefaults.standard.string(forKey: "StalightCampusGeofenceAuthToken")

        let urlStr = savedServerUrl ?? self.serverUrl
        guard let urlStr = urlStr, let url = URL(string: urlStr) else { return }

        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask(withName: "StalightCampusGeofencePing") {
            UIApplication.shared.endBackgroundTask(bgTask)
            bgTask = .invalid
        }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 5.0)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let token = savedAuthToken ?? self.authToken
        if let token = token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let location = self.locationManager?.location
        let lat = location?.coordinate.latitude ?? (region as? CLCircularRegion)?.center.latitude ?? 0.0
        let lng = location?.coordinate.longitude ?? (region as? CLCircularRegion)?.center.longitude ?? 0.0

        let body: [String: Any] = [
            "event": event,
            "latitude": lat,
            "longitude": lng
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Error sending iOS Geofence ping: \(error.localizedDescription)")
            } else {
                print("✅ Native iOS Geofence Ping Sent Successfully: \(event)")
            }
            if bgTask != .invalid {
                UIApplication.shared.endBackgroundTask(bgTask)
                bgTask = .invalid
            }
        }.resume()
    }
}
