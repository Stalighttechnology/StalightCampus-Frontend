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

public class GeofenceBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "CampusGeofenceReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        
        GeofencingEvent geofencingEvent = GeofencingEvent.fromIntent(intent);
        if (geofencingEvent == null || geofencingEvent.hasError()) {
            Log.e(TAG, "GeofencingEvent error code: " + (geofencingEvent != null ? geofencingEvent.getErrorCode() : "null"));
            pendingResult.finish();
            return;
        }

        int geofenceTransition = geofencingEvent.getGeofenceTransition();
        if (geofenceTransition == Geofence.GEOFENCE_TRANSITION_EXIT || geofenceTransition == Geofence.GEOFENCE_TRANSITION_ENTER) {
            String transitionType = (geofenceTransition == Geofence.GEOFENCE_TRANSITION_EXIT) ? "EXIT" : "ENTER";
            
            Log.i(TAG, "📍 Native Android System Geofence Event: " + transitionType);

            String serverUrl = intent.getStringExtra("server_url");
            String authToken = intent.getStringExtra("auth_token");

            if (serverUrl == null || serverUrl.isEmpty() || authToken == null || authToken.isEmpty()) {
                try {
                    android.content.SharedPreferences prefs = context.getSharedPreferences("StalightCampusGeofence", android.content.Context.MODE_PRIVATE);
                    if (serverUrl == null || serverUrl.isEmpty()) {
                        serverUrl = prefs.getString("server_url", "");
                    }
                    if (authToken == null || authToken.isEmpty()) {
                        authToken = prefs.getString("auth_token", "");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to read geofence settings from SharedPreferences", e);
                }
            }

            double lat = 0.0;
            double lng = 0.0;
            if (geofencingEvent.getTriggeringLocation() != null) {
                lat = geofencingEvent.getTriggeringLocation().getLatitude();
                lng = geofencingEvent.getTriggeringLocation().getLongitude();
            } else {
                try {
                    android.location.LocationManager lm = (android.location.LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
                    if (lm != null) {
                        android.location.Location loc = lm.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER);
                        if (loc == null) {
                            loc = lm.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER);
                        }
                        if (loc != null) {
                            lat = loc.getLatitude();
                            lng = loc.getLongitude();
                        }
                    }
                } catch (SecurityException se) {
                    Log.w(TAG, "Could not get last known location from LocationManager", se);
                }
            }

            if (serverUrl != null && !serverUrl.isEmpty()) {
                sendPingToServerAsync(serverUrl, authToken, transitionType, lat, lng, pendingResult);
            } else {
                pendingResult.finish();
            }
        } else {
            pendingResult.finish();
        }
    }

    private void sendPingToServerAsync(final String serverUrl, final String authToken, final String event, final double lat, final double lng, final PendingResult pendingResult) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(serverUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    if (authToken != null && !authToken.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + authToken);
                    }
                    conn.setDoOutput(true);

                    JSONObject jsonParam = new JSONObject();
                    jsonParam.put("event", event);
                    jsonParam.put("latitude", lat);
                    jsonParam.put("longitude", lng);

                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonParam.toString().getBytes("utf-8");
                        os.write(input, 0, input.length);
                    }

                    int responseCode = conn.getResponseCode();
                    Log.i(TAG, "Geofence ping response code: " + responseCode);
                    conn.disconnect();
                } catch (Exception e) {
                    Log.e(TAG, "Error sending geofence ping to server", e);
                } finally {
                    pendingResult.finish();
                }
            }
        }).start();
    }
}
