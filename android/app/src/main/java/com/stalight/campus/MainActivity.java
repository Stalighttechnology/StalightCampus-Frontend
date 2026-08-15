package com.stalight.campus;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Request codes for each permission step
    private static final int REQ_NOTIFICATIONS = 1001;
    private static final int REQ_CAMERA       = 1002;
    private static final int REQ_LOCATION     = 1003;
    private static final int REQ_BG_LOCATION  = 1004;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(CampusGeofencePlugin.class);

        // Kick off the sequential permission chain on first install.
        // Step 1: Notifications (Android 13+ only)
        requestNotificationsIfNeeded();
    }

    // ─── Step 1: Notifications ───────────────────────────────────────────────
    private void requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted = ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;

            if (!granted) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        REQ_NOTIFICATIONS
                );
                return; // wait for result → then camera
            }
        }
        // Already granted (or pre-Android 13) → skip straight to camera
        requestCameraIfNeeded();
    }

    // ─── Step 2: Camera ──────────────────────────────────────────────────────
    private void requestCameraIfNeeded() {
        boolean granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED;

        if (!granted) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    REQ_CAMERA
            );
            return; // wait for result → then location
        }
        // Already granted → skip straight to location
        requestLocationIfNeeded();
    }

    // ─── Step 3: Location (foreground) ───────────────────────────────────────
    private void requestLocationIfNeeded() {
        boolean fineGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean coarseGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        if (!fineGranted || !coarseGranted) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    REQ_LOCATION
            );
            return; // wait for result → then background location
        }
        // Already granted → check background location
        requestBackgroundLocationIfNeeded();
    }

    // ─── Step 4: Background Location ("Allow all the time") ──────────────────
    private void requestBackgroundLocationIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean granted = ContextCompat.checkSelfPermission(
                    this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            if (!granted) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                        REQ_BG_LOCATION
                );
            }
        }
        // All done — geofencing is fully enabled
    }

    // ─── Chain: result handler ────────────────────────────────────────────────
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults
    ) {
        // Always pass to super first so Capacitor plugins can handle their own results
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        switch (requestCode) {
            case REQ_NOTIFICATIONS:
                // Whether granted or denied, move on to Camera
                requestCameraIfNeeded();
                break;

            case REQ_CAMERA:
                // Whether granted or denied, move on to Location
                requestLocationIfNeeded();
                break;

            case REQ_LOCATION:
                // If foreground location granted, ask for background
                boolean locationGranted = grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                if (locationGranted) {
                    requestBackgroundLocationIfNeeded();
                }
                break;

            case REQ_BG_LOCATION:
                // Final step — nothing more to chain
                break;
        }
    }
}
