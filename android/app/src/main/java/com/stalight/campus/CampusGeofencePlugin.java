package com.stalight.campus;

import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

@CapacitorPlugin(name = "CampusGeofence")
public class CampusGeofencePlugin extends Plugin {
    private static final String TAG = "CampusGeofencePlugin";
    private GeofencingClient geofencingClient;

    @Override
    public void load() {
        super.load();
        geofencingClient = LocationServices.getGeofencingClient(getContext());
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void addGeofence(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        Double radius = call.getDouble("radius", 500.0);
        String campusId = call.getString("campusId", "DEFAULT_CAMPUS");
        String serverUrl = call.getString("serverUrl");
        String authToken = call.getString("authToken");

        if (latitude == null || longitude == null) {
            call.reject("Latitude and Longitude are required.");
            return;
        }

        Geofence geofence = new Geofence.Builder()
                .setRequestId("CAMPUS_GEOFENCE_" + campusId)
                .setCircularRegion(latitude, longitude, radius.floatValue())
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER | Geofence.GEOFENCE_TRANSITION_EXIT)
                .build();

        GeofencingRequest geofencingRequest = new GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofence(geofence)
                .build();

        PendingIntent pendingIntent = getGeofencePendingIntent(serverUrl, authToken);

        geofencingClient.addGeofences(geofencingRequest, pendingIntent)
                .addOnSuccessListener(aVoid -> {
                    Log.i(TAG, "Successfully registered Native Android Geofence for: " + campusId);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to register Native Android Geofence", e);
                    call.reject("Failed to register Geofence: " + e.getMessage());
                });
    }

    @PluginMethod
    public void removeGeofences(PluginCall call) {
        PendingIntent pendingIntent = getGeofencePendingIntent(null, null);
        geofencingClient.removeGeofences(pendingIntent)
                .addOnSuccessListener(aVoid -> {
                    Log.i(TAG, "Successfully removed Native Android Geofences");
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to remove Native Android Geofences", e);
                    call.reject("Failed to remove Geofences: " + e.getMessage());
                });
    }

    private PendingIntent getGeofencePendingIntent(String serverUrl, String authToken) {
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        if (serverUrl != null) intent.putExtra("server_url", serverUrl);
        if (authToken != null) intent.putExtra("auth_token", authToken);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }
}
