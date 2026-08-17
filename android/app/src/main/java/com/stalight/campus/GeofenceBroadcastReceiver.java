package com.stalight.campus;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * GeofenceBroadcastReceiver
 *
 * Receives ENTER / EXIT intents fired by the Android OS / Google Play Services
 * GeofencingClient — even when the app is killed or force-closed.
 *
 * Architecture: native-only, OS-managed geofencing (no foreground service).
 *
 * Google Play Services whitelists geofence broadcast receivers for a brief
 * network execution window, which is sufficient for a short authenticated
 * HTTPS POST to the Django backend.
 *
 * Safe execution pattern:
 *   goAsync() called immediately → background thread performs HTTP POST →
 *   pendingResult.finish() always called in the finally block.
 *
 * ⚠️  Android Background Execution Note:
 *   goAsync() extends the BroadcastReceiver execution window to approximately
 *   10 seconds (Android 8+). Connect + read timeouts are set conservatively
 *   at 5 s each. GMS geofence events are network-whitelisted by the OS so
 *   Doze does not block the HTTP call for these specific broadcasts.
 *   If the POST cannot complete in ~10 s (e.g. very slow server), the event
 *   will be silently dropped. The backend's select_for_update idempotency
 *   layer prevents any harm from a late duplicate delivery.
 *
 * ⚠️  Reboot Behaviour:
 *   Android GMS clears all registered geofences on device reboot. The faculty
 *   member must open the app after a reboot to re-register the geofence.
 *   This is the expected trade-off when running without a BootCompleteReceiver
 *   or foreground service.
 */
public class GeofenceBroadcastReceiver extends BroadcastReceiver {

    private static final String TAG = "CampusGeofenceReceiver";

    // Conservative timeouts that fit inside the goAsync() ~10 s window.
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS    = 5_000;

    @Override
    public void onReceive(Context context, Intent intent) {
        // ── MUST be called synchronously on the main thread before any I/O ────
        final PendingResult pendingResult = goAsync();

        try {
            // ── 1. Validate the geofence event ──────────────────────────────
            GeofencingEvent event = GeofencingEvent.fromIntent(intent);
            if (event == null || event.hasError()) {
                Log.e(TAG, "GeofencingEvent error: "
                        + (event != null ? event.getErrorCode() : "null event"));
                pendingResult.finish();
                return;
            }

            int transition = event.getGeofenceTransition();
            if (transition != Geofence.GEOFENCE_TRANSITION_EXIT
                    && transition != Geofence.GEOFENCE_TRANSITION_ENTER) {
                // Ignore DWELL and unknown transitions.
                pendingResult.finish();
                return;
            }

            final String transitionType = (transition == Geofence.GEOFENCE_TRANSITION_EXIT)
                    ? "EXIT" : "ENTER";
            Log.i(TAG, "📍 Native Android geofence event: " + transitionType);

            // ── 2. Resolve server URL + auth token ──────────────────────────
            // Try PendingIntent extras first (set when the geofence was registered).
            // Fall back to SharedPreferences for the killed-app path where extras
            // may have been stripped by the OS during delivery.
            String serverUrl = intent.getStringExtra("server_url");
            String authToken = intent.getStringExtra("auth_token");

            if (serverUrl == null || serverUrl.isEmpty()
                    || authToken == null || authToken.isEmpty()) {
                try {
                    android.content.SharedPreferences prefs =
                            context.getSharedPreferences(
                                    "StalightCampusGeofence", Context.MODE_PRIVATE);
                    if (serverUrl == null || serverUrl.isEmpty()) {
                        serverUrl = prefs.getString("server_url", "");
                    }
                    if (authToken == null || authToken.isEmpty()) {
                        authToken = prefs.getString("auth_token", "");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "SharedPreferences read failed", e);
                }
            }

            if (serverUrl == null || serverUrl.isEmpty()) {
                Log.e(TAG, "No server URL available — geofence ping dropped.");
                pendingResult.finish();
                return;
            }

            // ── 3. Resolve triggering coordinates ───────────────────────────
            double lat = 0.0, lng = 0.0;
            if (event.getTriggeringLocation() != null) {
                lat = event.getTriggeringLocation().getLatitude();
                lng = event.getTriggeringLocation().getLongitude();
            }

            // ── 4. Execute HTTPS POST on a background thread ────────────────
            // pendingResult.finish() is called in the finally block of the
            // thread — guaranteed even on exception or timeout.
            final String finalServerUrl = serverUrl;
            final String finalAuthToken  = authToken;
            final double finalLat        = lat;
            final double finalLng        = lng;

            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(finalServerUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
                    conn.setReadTimeout(READ_TIMEOUT_MS);
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    if (!finalAuthToken.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + finalAuthToken);
                    }
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("event",     transitionType);
                    body.put("latitude",  finalLat);
                    body.put("longitude", finalLng);

                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = body.toString().getBytes("utf-8");
                        os.write(input, 0, input.length);
                    }

                    int responseCode = conn.getResponseCode();
                    Log.i(TAG, "✅ Geofence ping sent ("
                            + transitionType + ") — HTTP " + responseCode);

                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send geofence ping: " + e.getMessage(), e);
                } finally {
                    if (conn != null) conn.disconnect();
                    // Always release the async slot — must be called on every code path.
                    pendingResult.finish();
                }
            }, "GeofencePingThread").start();

        } catch (Exception e) {
            // Catch-all: ensures pendingResult is always released even if thread
            // creation itself fails (extremely rare, e.g. OOM on boot).
            Log.e(TAG, "Unexpected error in onReceive: " + e.getMessage(), e);
            pendingResult.finish();
        }
    }
}
