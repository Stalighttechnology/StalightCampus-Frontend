import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// ─────────────────────────────────────────────────────────────────────────────
// Haversine distance helper (meters)
// ─────────────────────────────────────────────────────────────────────────────
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

// ─────────────────────────────────────────────────────────────────────────────
// Disclosure state machine
// IDLE       → modal is not mounted
// VISIBLE    → modal is shown to the user, awaiting decision
// ACCEPTED   → user tapped Continue
// DECLINED   → user tapped Not Now
// ─────────────────────────────────────────────────────────────────────────────
type DisclosureState = "IDLE" | "VISIBLE" | "ACCEPTED" | "DECLINED";

// ─────────────────────────────────────────────────────────────────────────────
// Role guard — only these roles trigger the geofence flow
// ─────────────────────────────────────────────────────────────────────────────
const GEOFENCE_ROLES = new Set(["teacher", "hod", "driver"]);

// ─────────────────────────────────────────────────────────────────────────────
// Tour wait — with a GUARANTEED timeout so the disclosure is never blocked
// indefinitely by an unresolved onboarding tour state.
//
// Strategy:
//   1. If the user-scoped seen key is already "true" → resolve immediately.
//   2. Poll every 800 ms for up to MAX_WAIT_MS (10 s).
//   3. After MAX_WAIT_MS, resolve regardless (guaranteed fallback).
//
// This means:
//   - Tour completed / skipped   → continues immediately
//   - No tour configured         → continues immediately
//   - Tour still running         → waits up to 10 s, then continues
//   - Tour state unavailable     → continues after 10 s
//   - NEVER hangs forever
// ─────────────────────────────────────────────────────────────────────────────
const MAX_TOUR_WAIT_MS = 10_000;

function waitForTourOrTimeout(tourSeenKey: string): Promise<void> {
  // Already done — no wait needed
  if (localStorage.getItem(tourSeenKey) === "true") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const deadline = setTimeout(() => {
      clearInterval(poll);
      console.log(
        "📍 Tour wait timed out — proceeding to location disclosure."
      );
      resolve();
    }, MAX_TOUR_WAIT_MS);

    const poll = setInterval(() => {
      if (localStorage.getItem(tourSeenKey) === "true") {
        clearInterval(poll);
        clearTimeout(deadline);
        resolve();
      }
    }, 800);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission check helpers — query actual Android permission state
// without triggering any system dialog.
// ─────────────────────────────────────────────────────────────────────────────
async function isForegroundLocationGranted(
  CampusGeofence: any
): Promise<boolean> {
  try {
    if (typeof CampusGeofence?.checkPermissions === "function") {
      const status = await CampusGeofence.checkPermissions();
      return status?.location === "granted";
    }
  } catch {
    /* fall through */
  }
  // Fallback: try Capacitor Geolocation plugin
  try {
    const status = await Geolocation.checkPermissions();
    return (
      status.location === "granted" || status.coarseLocation === "granted"
    );
  } catch {
    return false;
  }
}

async function isBackgroundLocationGranted(
  CampusGeofence: any
): Promise<boolean> {
  try {
    if (typeof CampusGeofence?.checkPermissions === "function") {
      const status = await CampusGeofence.checkPermissions();
      return status?.backgroundLocation === "granted";
    }
  } catch {
    /* fall through */
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ScheduledLocationTracker() {
  const { isAuthenticated, user, role } = useAuth();
  const hasReportedExitRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Disclosure state machine
  const [disclosureState, setDisclosureState] =
    useState<DisclosureState>("IDLE");
  // Promise resolver held in a ref so the async flow can await it
  const disclosureResolveRef = useRef<
    ((accepted: boolean) => void) | null
  >(null);

  // ── Helper: show the disclosure modal and return whether user accepted ──
  // This is the ONLY function that shows the disclosure.
  // It resolves with true (Continue) or false (Not Now).
  // The Promise is ALWAYS resolved — it never hangs.
  const showDisclosure = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      disclosureResolveRef.current = resolve;
      setDisclosureState("VISIBLE");
    });
  }, []);

  // ── Button handlers ──────────────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    setDisclosureState("ACCEPTED");
    if (disclosureResolveRef.current) {
      disclosureResolveRef.current(true);
      disclosureResolveRef.current = null;
    }
  }, []);

  const handleNotNow = useCallback(() => {
    setDisclosureState("DECLINED");
    if (disclosureResolveRef.current) {
      disclosureResolveRef.current(false);
      disclosureResolveRef.current = null;
    }
  }, []);

  // ── Reset disclosure to IDLE when it closes ──────────────────────────────
  // Allows the disclosure to be shown again (e.g., after "Not Now" then
  // the user re-opens the app and permissions are still missing).
  useEffect(() => {
    if (disclosureState === "ACCEPTED" || disclosureState === "DECLINED") {
      const t = setTimeout(() => setDisclosureState("IDLE"), 300);
      return () => clearTimeout(t);
    }
  }, [disclosureState]);

  // ── Main geofence initialisation ─────────────────────────────────────────
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

    // ── Role guard: students and parents never trigger geofencing ──────────
    if (!isAuthenticated || !user || !role || !GEOFENCE_ROLES.has(role)) {
      stopWebWatchers();
      return;
    }

    const startGeofenceTracker = async () => {
      try {
        console.log("📍 Initialising Faculty Geofence Location Tracker…");

        // ── Step 1: Fetch active campus bounds ────────────────────────────
        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/admin/monitoring/active/`
        );
        const data = await res.json();

        // Sync local exit-report state with server alert state
        if (data.alerts && user) {
          const userId = user.id || user.user_id;
          const hasActiveAlertOnServer = data.alerts.some(
            (alert: any) => String(alert.faculty_id) === String(userId)
          );
          hasReportedExitRef.current = !!hasActiveAlertOnServer;
          console.log(
            `📍 Geofence exit state synced from server: ${hasReportedExitRef.current}`
          );
        }

        if (
          !isMounted ||
          !data.success ||
          !data.campuses ||
          data.campuses.length === 0
        ) {
          console.warn(
            "No active campus locations found for geofence tracking.",
            data
          );
          return;
        }

        // Rule 1 (Present only) & Rule 2 (No tracking after 7 PM)
        if (data.tracking_allowed === false) {
          if (data.is_after_7pm) {
            console.log(
              "⏰ Past 7:00 PM: Geofence tracking disabled for the evening."
            );
          } else if (data.is_present_today === false) {
            console.log(
              "🚫 Faculty not marked present today: Geofence tracking disabled."
            );
          }
          return;
        }

        const campus = data.campuses[0];
        const centerLat = campus.latitude;
        const centerLng = campus.longitude;
        const radiusMeters = campus.radius_meters || 500;

        if (!centerLat || !centerLng) {
          console.warn("Active campus location missing centre coordinates.");
          return;
        }

        // ── Step 2: Native-only geofence path ─────────────────────────────
        if (Capacitor.isNativePlatform()) {
          const token =
            data.geofence_token || localStorage.getItem("access_token");
          const CampusGeofence = registerPlugin<any>("CampusGeofence");

          // ── 2a. Check ACTUAL Android permission state (no dialog) ────────
          //    SOURCE OF TRUTH: what the OS says, not a localStorage flag.
          const foregroundGranted =
            await isForegroundLocationGranted(CampusGeofence);
          const backgroundGranted =
            foregroundGranted &&
            (await isBackgroundLocationGranted(CampusGeofence));

          const permissionsAlreadyGranted =
            foregroundGranted && backgroundGranted;

          if (!permissionsAlreadyGranted) {
            // ── 2b. Permissions are missing — MUST show disclosure first ───
            //
            // Brief safety delay (1.5 s) so the dashboard / onboarding tour
            // modal is not visually competing with the disclosure on first
            // open. This is intentionally SHORT — we never poll forever.
            //
            // Additionally, if a tour is running, wait for it to finish or
            // time out (max 10 s). This prevents Joyride's overlay from
            // clashing with the disclosure, while guaranteeing that the
            // disclosure always appears eventually.
            await new Promise<void>((r) => setTimeout(r, 1500));

            if (isMounted) {
              const resolveUserId = (u: any): string => {
                if (u?.user_id) return String(u.user_id);
                if (u?.id) return String(u.id);
                try {
                  const stored = sessionStorage.getItem("user");
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed?.user_id) return String(parsed.user_id);
                    if (parsed?.id) return String(parsed.id);
                  }
                } catch {
                  /* ignore */
                }
                return "anonymous";
              };

              const userId = resolveUserId(user);
              const tourSeenKey = `tutorial_seen_${userId}_1`;

              // Guaranteed-terminating tour wait (max 10 s fallback)
              await waitForTourOrTimeout(tourSeenKey);
            }

            if (!isMounted) return;

            // ── 2c. PROMINENT DISCLOSURE — immediately before permission ───
            //
            // Google Play requirement:
            //   • Exists inside the app
            //   • Appears during normal usage
            //   • Immediately before the location runtime permission
            //   • Contains "location" and "when the app is closed or not in use"
            //   • Explains the geofencing feature and server transmission
            //   • Requires explicit affirmative action (Continue) to proceed
            //
            const accepted = await showDisclosure();

            if (!accepted) {
              // User tapped "Not Now" — abort entirely.
              // NO permission is requested. NO geofence is registered.
              // On next app open, if permissions are still missing,
              // the disclosure will be shown again.
              console.log(
                "📍 User declined location disclosure — geofencing aborted."
              );
              return;
            }

            // ── 2d. Request foreground location permission ─────────────────
            //    Immediately after Continue — this is the system dialog.
            try {
              if (CampusGeofence.requestGeofencePermissions) {
                await CampusGeofence.requestGeofencePermissions();
              }
            } catch (permErr) {
              console.warn(
                "Foreground location permission not granted:",
                permErr
              );
              // If denied, abort — do not register geofence without permission
              return;
            }

            // Brief OS animation settle time
            await new Promise<void>((r) => setTimeout(r, 800));

            // ── 2e. Request background location permission ─────────────────
            //    On Android 11+ this opens Location Settings with
            //    "Allow all the time" option.
            try {
              if (CampusGeofence.requestBackgroundPermission) {
                await CampusGeofence.requestBackgroundPermission();
              }
            } catch (bgErr) {
              console.warn(
                "Background location permission not granted:",
                bgErr
              );
              // Non-fatal: geofence will not fire when app is killed,
              // but register anyway for foreground-only coverage.
            }
          } else {
            // Permissions already granted — silently re-register geofence.
            // No disclosure is needed because no permission dialog will be shown.
            console.log(
              "📍 Location permissions already granted — re-registering geofence."
            );
          }

          if (!isMounted) return;

          // ── Step 3: Register native geofence ──────────────────────────────
          // Android → GeofencingClient → GeofenceBroadcastReceiver → Django POST
          // iOS    → CLCircularRegion  → CampusGeofencePlugin.swift → Django POST
          try {
            await CampusGeofence.addGeofence({
              latitude: centerLat,
              longitude: centerLng,
              radius: radiusMeters,
              campusId: campus.id?.toString() || "CAMPUS_1",
              serverUrl: `${API_ENDPOINT}/faculty/location/scheduled-ping/`,
              authToken: token || "",
            });
            console.log(
              `✅ Native ${Capacitor.getPlatform().toUpperCase()} Geofence registered — centre (${centerLat}, ${centerLng}), radius ${radiusMeters}m`
            );
          } catch (geoErr) {
            console.warn("Native Geofence registration error:", geoErr);
          }

          // ── Step 4: One-time initial position check ────────────────────────
          // Handles the edge case where faculty opens the app while already
          // outside campus — the OS only fires EXIT when crossing the boundary,
          // not when the app starts outside it.
          // Only run this if foreground permission is confirmed granted.
          const fgNow = await isForegroundLocationGranted(CampusGeofence);
          if (fgNow && isMounted) {
            try {
              const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });

              if (pos?.coords && isMounted) {
                const distance = calculateDistanceMeters(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  centerLat,
                  centerLng
                );
                const isOutside = distance > radiusMeters;
                console.log(
                  `📍 Initial position check: ${Math.round(distance)}m from campus centre (outside=${isOutside})`
                );

                if (isOutside && !hasReportedExitRef.current) {
                  hasReportedExitRef.current = true;
                  try {
                    const alertRes = await fetchWithTokenRefresh(
                      `${API_ENDPOINT}/faculty/location/scheduled-ping/`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          event: "EXIT",
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude,
                          distance_meters: distance,
                          scheduled_time: new Date().toISOString(),
                        }),
                      }
                    );
                    const alertData = await alertRes.json();
                    console.log("🚨 Initial EXIT alert response:", alertData);
                  } catch (alertErr) {
                    console.error(
                      "Failed to post initial location exit alert:",
                      alertErr
                    );
                    hasReportedExitRef.current = false;
                  }
                } else if (!isOutside) {
                  hasReportedExitRef.current = false;
                  try {
                    const alertRes = await fetchWithTokenRefresh(
                      `${API_ENDPOINT}/faculty/location/scheduled-ping/`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          event: "ENTER",
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude,
                          distance_meters: distance,
                          scheduled_time: new Date().toISOString(),
                        }),
                      }
                    );
                    const alertData = await alertRes.json();
                    console.log(
                      "📍 Initial inside check: synced ENTER event:",
                      alertData
                    );
                  } catch (alertErr) {
                    console.error(
                      "Failed to post initial location enter alert:",
                      alertErr
                    );
                  }
                }
              }
            } catch (initErr) {
              console.warn(
                "Initial position check failed (non-critical):",
                initErr
              );
            }
          }

          // All subsequent movement is handled by the native OS geofence.
          // No watchPosition or polling is started on a real device.
          return;
        }

        // ── Web / Browser fallback ─────────────────────────────────────────
        // Used only for admin testing in a desktop browser.
        // Real devices never reach this code path.
        console.log(
          "🌐 Web mode: starting browser GPS watch + polling fallback."
        );

        const processPositionWeb = async (
          latitude: number,
          longitude: number
        ) => {
          const distance = calculateDistanceMeters(
            latitude,
            longitude,
            centerLat,
            centerLng
          );
          const isOutside = distance > radiusMeters;
          console.log(
            `📍 Web Position: (${latitude}, ${longitude}) — ${Math.round(distance)}m from campus`
          );

          if (isOutside && !hasReportedExitRef.current) {
            hasReportedExitRef.current = true;
            try {
              const alertRes = await fetchWithTokenRefresh(
                `${API_ENDPOINT}/faculty/location/scheduled-ping/`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    latitude,
                    longitude,
                    event: "EXIT",
                    distance_meters: distance,
                    scheduled_time: new Date().toISOString(),
                  }),
                }
              );
              const alertData = await alertRes.json();
              console.log("✅ Web EXIT alert:", alertData);
            } catch (alertErr) {
              console.error("Failed to post web exit alert:", alertErr);
              hasReportedExitRef.current = false;
            }
          } else if (!isOutside && hasReportedExitRef.current) {
            hasReportedExitRef.current = false;
            console.log("✅ Web: faculty re-entered campus boundary.");
          }
        };

        const checkCurrentLocationWeb = async () => {
          try {
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
            if (pos?.coords)
              await processPositionWeb(
                pos.coords.latitude,
                pos.coords.longitude
              );
          } catch (err) {
            console.warn("Web location check failed:", err);
          }
        };

        await checkCurrentLocationWeb();

        if (navigator.geolocation) {
          const navWatchId = navigator.geolocation.watchPosition(
            (pos) =>
              processPositionWeb(pos.coords.latitude, pos.coords.longitude),
            (err) => console.warn("Browser watch error:", err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
          );
          watchIdRef.current = navWatchId;
        }
        intervalIdRef.current = setInterval(checkCurrentLocationWeb, 15000);
      } catch (error: any) {
        console.error("Failed to start geofence tracker:", error);
      }
    };

    startGeofenceTracker();

    // Re-register geofence when app returns to foreground.
    // startGeofenceTracker() will check actual permission state and show
    // the disclosure again if permissions are missing.
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", (state) => {
        if (state.isActive) {
          console.log(
            "📱 App resumed: re-syncing campus geofence boundary…"
          );
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
  }, [isAuthenticated, user, role, showDisclosure]);

  // ── Render — only visible when disclosure is in VISIBLE state ─────────────
  if (disclosureState !== "VISIBLE") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      // Prevent tap-outside from dismissing — user must make an explicit choice
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-4 text-center">

          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
            Location Access
          </h3>

          {/* Primary disclosure body — Google Play required text */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Stalight Campus collects location data to enable campus geofencing
            and automatically detect when authorized faculty and staff enter or
            leave the configured campus boundary, even when the app is closed
            or not in use. This location data is securely transmitted to
            Stalight Campus servers and is used for real-time campus safety
            alerts and related campus operations.
          </p>

          {/* Supplementary detail box */}
          <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/50 p-3 rounded-lg border border-border">
            You will be asked to grant location permission to enable background
            campus boundary monitoring. You can manage this permission at any
            time in Android Settings.
          </p>

          {/* Action buttons */}
          <div className="flex gap-3 w-full mt-2">
            <button
              id="location-disclosure-not-now"
              onClick={handleNotNow}
              className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Not Now
            </button>
            <button
              id="location-disclosure-continue"
              onClick={handleContinue}
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
