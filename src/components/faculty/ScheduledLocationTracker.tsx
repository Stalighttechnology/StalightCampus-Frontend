import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// Haversine distance in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ScheduledLocationTracker() {
  const { isAuthenticated, user, role } = useAuth();
  const hasReportedExitRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const onAcceptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const stopWebWatchers = () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    if (!isAuthenticated || !user || role === 'student' || role === 'parent') {
      stopWebWatchers();
      return;
    }

    const startGeofenceTracker = async () => {
      try {
        console.log("📍 Initializing Faculty Geofence Location Tracker...");

        // ── Step 1: Fetch active campus bounds ──────────────────────────────
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
            console.log("🚫 Faculty not marked present today: Geofence tracking disabled.");
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

        // ── Step 2: Register native OS geofence ─────────────────────────────
        // Android → GeofencingClient → GeofenceBroadcastReceiver → Django POST
        // iOS    → CLCircularRegion  → CampusGeofencePlugin.swift → Django POST
        // The native OS fires EXIT/ENTER events and posts directly to the backend,
        // even when the app is killed/backgrounded.
        if (Capacitor.isNativePlatform()) {
          const token = data.geofence_token || localStorage.getItem('access_token');
          const CampusGeofence = registerPlugin<any>("CampusGeofence");

          try {
            // Wait for the onboarding tour guide to finish or be skipped before prompting for geofence permissions.
            // This prevents Joyride's overlay/welcome modal from clashing with the location disclosure modal.
            const resolveUserId = (u: any): string => {
              if (u?.user_id) return String(u.user_id);
              if (u?.id) return String(u.id);
              try {
                const stored = sessionStorage.getItem('user');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed?.user_id) return String(parsed.user_id);
                  if (parsed?.id) return String(parsed.id);
                }
              } catch {}
              return 'anonymous';
            };

            const userId = resolveUserId(user);
            const tourSeenKey = `tutorial_seen_${userId}_1`;
            
            const waitForTourToFinish = async () => {
              if (localStorage.getItem(tourSeenKey) === 'true') {
                return;
              }
              await new Promise<void>((resolve) => {
                const interval = setInterval(() => {
                  if (localStorage.getItem(tourSeenKey) === 'true') {
                    clearInterval(interval);
                    resolve();
                  }
                }, 1000);
              });
            };

            await waitForTourToFinish();

            // Check native geofence permissions status
            let permissionsGranted = false;
            try {
              const permState = await CampusGeofence.checkPermissions();
              // For iOS, background location is tied to CLLocationManager always authorization.
              // For Android Q+, both location (foreground) and backgroundLocation aliases must be granted.
              const isForegroundGranted = permState.location === 'granted';
              const isBackgroundGranted = permState.backgroundLocation === 'granted';
              permissionsGranted = isForegroundGranted && isBackgroundGranted;
            } catch (err) {
              console.warn("Could not check native geofence permissions:", err);
            }

            if (!permissionsGranted) {
              // Always show prominent disclosure modal before prompting/redirecting if background permissions are missing
              await new Promise<void>((resolve) => {
                onAcceptRef.current = () => resolve();
                setShowDisclosure(true);
              });
              
              if (CampusGeofence.requestGeofencePermissions) {
                await CampusGeofence.requestGeofencePermissions();
              }

              // Allow the system window transition to stabilize before launching settings
              await new Promise((resolve) => setTimeout(resolve, 1000));

              if (CampusGeofence.requestBackgroundPermission) {
                await CampusGeofence.requestBackgroundPermission();
              } else if (Capacitor.getPlatform() === 'android') {
                console.warn("⚠️ CampusGeofence.requestBackgroundPermission is undefined. Rebuild the app in Android Studio.");
                toast.error("Developer warning: Please clean and rebuild the app in Android Studio to apply the updated Java geofence plugin.");
              }
            }

            await CampusGeofence.addGeofence({
              latitude: centerLat,
              longitude: centerLng,
              radius: radiusMeters,
              campusId: campus.id?.toString() || "CAMPUS_1",
              serverUrl: `${API_ENDPOINT}/faculty/location/scheduled-ping/`,
              authToken: token || ""
            });
            console.log(`✅ Native ${Capacitor.getPlatform().toUpperCase()} Geofence registered — center (${centerLat}, ${centerLng}), radius ${radiusMeters}m`);
          } catch (geoErr) {
            console.warn("Native Geofence registration error:", geoErr);
          }

          // ── Step 3 (native only): One-time initial position check ──────────
          // Handles the edge case where faculty opens the app while already
          // outside campus — the OS only fires EXIT when crossing the boundary,
          // not when the app starts outside it.
          try {
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false, // Don't block on hard GPS satellite lock
              timeout: 10000,
              maximumAge: 300000 // Allow up to 5 minutes old cached location
            });

            if (pos?.coords && isMounted) {
              const distance = calculateDistanceMeters(
                pos.coords.latitude, pos.coords.longitude,
                centerLat, centerLng
              );
              const isOutside = distance > radiusMeters;
              console.log(`📍 Initial position check: ${Math.round(distance)}m from campus centre (outside=${isOutside})`);

              if (isOutside && !hasReportedExitRef.current) {
                hasReportedExitRef.current = true;
                
                try {
                  const alertRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event: 'EXIT',
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      distance_meters: distance,
                      scheduled_time: new Date().toISOString()
                    })
                  });
                  const alertData = await alertRes.json();
                  console.log("🚨 Initial EXIT alert response:", alertData);
                } catch (alertErr) {
                  console.error("Failed to post initial location exit alert:", alertErr);
                  hasReportedExitRef.current = false;
                }
              } else if (!isOutside) {
                // Reset flag and send an ENTER ping to ensure any stale alerts from missed network notifications are resolved
                hasReportedExitRef.current = false;
                try {
                  const alertRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event: 'ENTER',
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      distance_meters: distance,
                      scheduled_time: new Date().toISOString()
                    })
                  });
                  const alertData = await alertRes.json();
                  console.log("📍 Initial inside check: synced ENTER event to resolve stale alerts:", alertData);
                } catch (alertErr) {
                  console.error("Failed to post initial location enter alert resolution:", alertErr);
                }
              }
            }
          } catch (initErr) {
            console.warn("Initial position check failed (non-critical):", initErr);
          }

          // All subsequent movement is handled by the native OS geofence.
          // No watchPosition or polling is started on a real device.
          return;
        }

        // ── Web / Browser fallback ────────────────────────────────────────────
        // Used only for admin testing in a desktop browser.
        // Real devices never reach this code path.
        console.log("🌐 Web mode: starting browser GPS watch + polling fallback.");

        const processPositionWeb = async (latitude: number, longitude: number) => {
          const distance = calculateDistanceMeters(latitude, longitude, centerLat, centerLng);
          const isOutside = distance > radiusMeters;
          console.log(`📍 Web Position: (${latitude}, ${longitude}) — ${Math.round(distance)}m from campus`);

          if (isOutside && !hasReportedExitRef.current) {
            hasReportedExitRef.current = true;
            try {
              const alertRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude, longitude,
                  event: 'EXIT',
                  distance_meters: distance,
                  scheduled_time: new Date().toISOString()
                })
              });
              const alertData = await alertRes.json();
              console.log("✅ Web EXIT alert:", alertData);
            } catch (alertErr) {
              console.error("Failed to post web exit alert:", alertErr);
              hasReportedExitRef.current = false; // Allow retry
            }
          } else if (!isOutside && hasReportedExitRef.current) {
            hasReportedExitRef.current = false;
            console.log("✅ Web: faculty re-entered campus boundary.");
          }
        };

        const checkCurrentLocationWeb = async () => {
          try {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            if (pos?.coords) await processPositionWeb(pos.coords.latitude, pos.coords.longitude);
          } catch (err) {
            console.warn("Web location check failed:", err);
          }
        };

        // Initial check
        await checkCurrentLocationWeb();

        // Continuous watch
        if (navigator.geolocation) {
          const navWatchId = navigator.geolocation.watchPosition(
            (pos) => processPositionWeb(pos.coords.latitude, pos.coords.longitude),
            (err) => console.warn("Browser watch error:", err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
          );
          watchIdRef.current = navWatchId;
        }
        // 15s polling safety net for desktop
        intervalIdRef.current = setInterval(checkCurrentLocationWeb, 15000);

      } catch (error) {
        console.error("Failed to start geofence tracker:", error);
      }
    };

    startGeofenceTracker();

    // Re-register geofence when app comes back to foreground
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log("📱 App resumed: re-syncing campus geofence boundary...");
          startGeofenceTracker();
        }
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    return () => {
      isMounted = false;
      if (appStateListener) appStateListener.remove();
      stopWebWatchers();
    };
  }, [isAuthenticated, user, role]);

  if (!showDisclosure) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-card-foreground">Location Access</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Stalight Campus collects **location** data to enable campus geofence monitoring and real-time out-of-bounds safety alerts **even when the app is closed or not in use**.
          </p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/50 p-3 rounded-lg border border-border">
            Your location is used to detect when you enter or leave the configured campus boundary and notify authorized institution personnel.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={() => setShowDisclosure(false)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={() => {
                setShowDisclosure(false);
                if (onAcceptRef.current) {
                  onAcceptRef.current();
                }
              }}
              className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 shadow-sm transition-colors"
            >
              Continue
            </button>
          </div>
            </div>
          </div>
        </div>
  );
}
