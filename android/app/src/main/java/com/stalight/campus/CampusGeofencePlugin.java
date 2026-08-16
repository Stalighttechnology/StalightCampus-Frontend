package com.stalight.campus;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Intent;
import android.util.Log;

import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;

@CapacitorPlugin(
    name = "CampusGeofence",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = {
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            }
        )
    }
)
public class CampusGeofencePlugin extends Plugin {
    private static final String TAG = "CampusGeofencePlugin";
    private GeofencingClient geofencingClient;

    // Store the last registered URL and token so they survive removeGeofences() calls
    private String lastServerUrl = null;
    private String lastAuthToken = null;

    @Override
    public void load() {
        super.load();
        geofencingClient = LocationServices.getGeofencingClient(getContext());
    }

    @PluginMethod
    public void requestGeofencePermissions(PluginCall call) {
        boolean foregroundGranted = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        if (!foregroundGranted) {
            requestPermissionForAlias("location", call, "locationCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void locationCallback(PluginCall call) {
        boolean foregroundGranted = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        if (foregroundGranted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            call.reject("Location permission is required for campus geofence monitoring.");
        }
    }

    @PluginMethod
    public void requestBackgroundPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean backgroundGranted = ContextCompat.checkSelfPermission(
                    getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            if (!backgroundGranted) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    launchBackgroundLocationSettings(call);
                } else {
                    requestPermissionForAlias("backgroundLocation", call, "backgroundCallback");
                }
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    private void launchBackgroundLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            android.net.Uri uri = android.net.Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject ret = new JSObject();
            ret.put("settingsOpened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PermissionCallback
    private void backgroundCallback(PluginCall call) {
        boolean backgroundGranted = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        if (backgroundGranted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            call.reject("Background location permission (Allow all the time) is required for background geofence alerts.");
        }
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

        // Cache so GeofenceBroadcastReceiver always has fresh URL + token
        lastServerUrl = serverUrl;
        lastAuthToken = authToken;

        try {
            getContext().getSharedPreferences("StalightCampusGeofence", android.content.Context.MODE_PRIVATE)
                    .edit()
                    .putString("server_url", serverUrl)
                    .putString("auth_token", authToken)
                    .apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to save geofence settings to SharedPreferences", e);
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
        // Use NO_CREATE so we never overwrite the intent extras with nulls
        PendingIntent pendingIntent = getRemovePendingIntent();
        if (pendingIntent == null) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            return;
        }
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
        intent.putExtra("server_url", serverUrl != null ? serverUrl : "");
        intent.putExtra("auth_token", authToken != null ? authToken : "");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }

    private PendingIntent getRemovePendingIntent() {
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        int flags = PendingIntent.FLAG_NO_CREATE;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }
}
