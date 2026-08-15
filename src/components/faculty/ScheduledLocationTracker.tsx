import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// Register BackgroundGeolocation plugin for persistent Android Foreground Service location monitoring
const BackgroundGeolocation = registerPlugin<any>("BackgroundGeolocation");

// Helper function to calculate distance in meters between two lat/lng points (Haversine formula)
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ScheduledLocationTracker() {
  const { isAuthenticated, user } = useAuth();
  const hasReportedExitRef = useRef(false);
  const watchIdRef = useRef<string | number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const stopWatchers = () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current as string });
        } else if (navigator.geolocation && typeof watchIdRef.current === 'number') {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    if (!isAuthenticated || !user || !['teacher', 'faculty', 'hod'].includes(user?.role || '')) {
      stopWatchers();
      return;
    }

    const startGeofenceTracker = async () => {
      try {
        console.log("📍 Initializing Faculty Geofence Location Tracker...");

        // 1. Request Geolocation Permissions Explicitly
        if (Capacitor.isNativePlatform()) {
          try {
            let permStatus = await Geolocation.checkPermissions();
            if (permStatus.location !== 'granted') {
              console.log("Requesting Location Permissions for Geofence Tracking...");
              await Geolocation.requestPermissions();
            }
          } catch (e) {
            console.warn("Failed to request native Geolocation permissions:", e);
          }
        }

        // 2. Fetch Active Campus Boundaries from Backend
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/active/`);
        const data = await res.json();
        
        if (!isMounted || !data.success || !data.campuses || data.campuses.length === 0) {
          console.warn("No active campus locations found for geofence tracking.", data);
          return;
        }

        // Rule 1 (Present only) & Rule 2 (No tracking after 7 PM)
        if (data.tracking_allowed === false) {
          if (data.is_after_7pm) {
            console.log("⏰ Past 7:00 PM: Geofence tracking disabled for the evening.");
          } else if (data.is_present_today === false) {
            console.log("🚫 Faculty is absent or has not marked present today: Geofence tracking disabled.");
          }
          return;
        }

        const campus = data.campuses[0];
        const centerLat = campus.latitude;
        const centerLng = campus.longitude;
        const radiusMeters = campus.radius_meters || 500;

        if (!centerLat || !centerLng) {
          console.warn("Active campus location missing center coordinates.");
          return;
        }

        console.log(`✅ Geofence active for ${campus.name}: Center (${centerLat}, ${centerLng}), Radius: ${radiusMeters}m`);

        // Function to evaluate current GPS position against campus boundary
        const processPosition = async (latitude: number, longitude: number) => {
          const distance = calculateDistanceMeters(latitude, longitude, centerLat, centerLng);
          const isOutside = distance > radiusMeters;

          console.log(`📍 Current Position: (${latitude}, ${longitude}) - Distance from campus: ${Math.round(distance)}m (Radius: ${radiusMeters}m)`);

          if (isOutside) {
            if (!hasReportedExitRef.current) {
              console.warn(`🚨 GEOFENCE EXIT DETECTED! Distance: ${Math.round(distance)}m > ${radiusMeters}m. Dispatching alert to backend...`);
              hasReportedExitRef.current = true;
              
              try {
                const alertRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    latitude: latitude,
                    longitude: longitude,
                    event: "EXIT",
                    distance_meters: distance,
                    scheduled_time: new Date().toISOString()
                  })
                });
                const alertData = await alertRes.json();
                console.log("✅ Alert API Response:", alertData);
              } catch (alertErr) {
                console.error("Failed to post location exit alert:", alertErr);
                hasReportedExitRef.current = false; // Allow retry on error
              }
            }
          } else {
            // User is inside campus boundary — reset exit flag so next exit is caught cleanly
            if (hasReportedExitRef.current) {
              console.log("✅ User returned inside campus boundary. Informing backend...");
              hasReportedExitRef.current = false;
              
              try {
                await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    latitude: latitude,
                    longitude: longitude,
                    event: "ENTER",
                    scheduled_time: new Date().toISOString()
                  })
                });
              } catch (enterErr) {
                console.error("Failed to post location enter ping:", enterErr);
              }
            }
          }
        };

        // Check position function helper
        const checkCurrentLocation = async () => {
          try {
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
            if (pos && pos.coords) {
              await processPosition(pos.coords.latitude, pos.coords.longitude);
            }
          } catch (err) {
            console.warn("Could not fetch location:", err);
          }
        };

        // Initial Position Check
        await checkCurrentLocation();

        // 3. Start Continuous GPS Position Watch
        if (Capacitor.isNativePlatform()) {
          try {
            // Use BackgroundGeolocation Foreground Service on Android/iOS to maintain location tracking even if force-closed/killed
            const watcherId = await BackgroundGeolocation.addWatcher(
              {
                backgroundTitle: "Stalight Campus Active",
                backgroundMessage: "Campus location monitoring is active.",
                requestPermissions: true,
                stale: false,
                distanceFilter: 10
              },
              (location: any, error: any) => {
                if (error) {
                  console.warn("BackgroundGeolocation error:", error);
                  return;
                }
                if (location && location.latitude && location.longitude) {
                  processPosition(location.latitude, location.longitude);
                }
              }
            );
            watchIdRef.current = watcherId;
          } catch (bgErr) {
            console.warn("BackgroundGeolocation failed, falling back to Geolocation.watchPosition:", bgErr);
            const watchId = await Geolocation.watchPosition(
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
              (position, err) => {
                if (err) return;
                if (position && position.coords) {
                  processPosition(position.coords.latitude, position.coords.longitude);
                }
              }
            );
            watchIdRef.current = watchId;
          }
        } else {
          if (navigator.geolocation) {
            const navWatchId = navigator.geolocation.watchPosition(
              (pos) => processPosition(pos.coords.latitude, pos.coords.longitude),
              (err) => console.warn("Browser Geolocation watch error:", err),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
            );
            watchIdRef.current = navWatchId;
          }
          // On Web Browser / Desktop testing: Add 15s polling failsafe since laptops do not physically move
          intervalIdRef.current = setInterval(checkCurrentLocation, 15000);
        }

        // Native OS Geofencing handles location movement automatically via watchPosition
        // Zero periodic timers or frequent server calls are made

      } catch (error) {
        console.error("Failed to start geofence tracker:", error);
      }
    };

    startGeofenceTracker();

    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log("📱 App resumed: Re-syncing active campus geofence boundary...");
          startGeofenceTracker();
        }
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    return () => {
      isMounted = false;
      if (appStateListener) {
        appStateListener.remove();
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      if (watchIdRef.current !== null) {
        if (typeof watchIdRef.current === 'string') {
          Geolocation.clearWatch({ id: watchIdRef.current }).catch(console.error);
        } else if (typeof watchIdRef.current === 'number' && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    };
  }, []);

  return null; // Headless background component
}
