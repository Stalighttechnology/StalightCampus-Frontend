package com.stalight.campus;

import android.app.Activity;
import android.content.IntentSender;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.Task;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * InAppUpdateManager handles Google Play In-App Updates using the official
 * Google Play App Update library with an Immediate / Force Update strategy.
 */
public class InAppUpdateManager {

    private static final String TAG = "InAppUpdateManager";

    private final AppCompatActivity activity;
    private final AppUpdateManager appUpdateManager;
    private final ActivityResultLauncher<IntentSenderRequest> updateLauncher;

    private boolean isUpdateFlowInProgress = false;
    private AlertDialog fallbackDialog = null;

    public InAppUpdateManager(@NonNull AppCompatActivity activity,
                              @NonNull ActivityResultLauncher<IntentSenderRequest> updateLauncher) {
        this.activity = activity;
        this.updateLauncher = updateLauncher;
        this.appUpdateManager = AppUpdateManagerFactory.create(activity.getApplicationContext());
    }

    /**
     * Checks if a new version is available on Google Play and starts an immediate update flow.
     */
    public void checkForImmediateUpdate() {
        if (isUpdateFlowInProgress) {
            Log.d(TAG, "Update flow already in progress, skipping check.");
            return;
        }

        Log.d(TAG, "Checking for Google Play in-app update...");
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();

        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            int availability = appUpdateInfo.updateAvailability();
            Log.d(TAG, "Update availability status: " + availability);

            if (availability == UpdateAvailability.UPDATE_AVAILABLE
                    && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                Log.i(TAG, "Immediate update available. Starting update flow.");
                startImmediateUpdate(appUpdateInfo);
            } else if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                Log.i(TAG, "Developer triggered update in progress. Resuming.");
                startImmediateUpdate(appUpdateInfo);
            } else {
                Log.d(TAG, "No immediate update required (availability=" + availability + ").");
            }
        }).addOnFailureListener(e -> {
            // Fails gracefully if Google Play services are missing, app is sideloaded, or network is down.
            Log.w(TAG, "Failed to check for in-app update: " + e.getMessage());
        });
    }

    /**
     * Resumes an interrupted immediate update when activity returns to foreground.
     */
    public void resumeUpdateIfInProgress() {
        Log.d(TAG, "Checking if immediate update needs to be resumed...");
        appUpdateManager.getAppUpdateInfo()
                .addOnSuccessListener(appUpdateInfo -> {
                    if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                        Log.i(TAG, "Resuming in-progress immediate update flow.");
                        startImmediateUpdate(appUpdateInfo);
                    }
                })
                .addOnFailureListener(e -> {
                    Log.w(TAG, "Failed to resume in-app update check: " + e.getMessage());
                });
    }

    /**
     * Starts the Google Play Immediate Update flow.
     */
    private void startImmediateUpdate(@NonNull AppUpdateInfo appUpdateInfo) {
        if (isUpdateFlowInProgress) {
            Log.d(TAG, "Immediate update UI already requested or shown.");
            return;
        }

        try {
            isUpdateFlowInProgress = true;
            AppUpdateOptions options = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build();
            appUpdateManager.startUpdateFlowForResult(appUpdateInfo, updateLauncher, options);
        } catch (Exception e) {
            isUpdateFlowInProgress = false;
            Log.e(TAG, "Error starting immediate update flow: " + e.getMessage(), e);
            showUpdateRequiredDialog();
        }
    }

    /**
     * Handles the Activity Result from the Play Store In-App Update flow.
     */
    public void handleActivityResult(@NonNull ActivityResult result) {
        isUpdateFlowInProgress = false;
        int resultCode = result.getResultCode();

        if (resultCode == Activity.RESULT_OK) {
            Log.i(TAG, "Immediate update completed successfully.");
            dismissFallbackDialog();
        } else if (resultCode == Activity.RESULT_CANCELED) {
            Log.w(TAG, "Immediate update flow was canceled by user.");
            showUpdateRequiredDialog();
        } else {
            Log.w(TAG, "Immediate update flow failed with resultCode: " + resultCode);
            showUpdateRequiredDialog();
        }
    }

    /**
     * Displays a non-dismissible fallback dialog when an update is mandatory and was not completed.
     */
    private void showUpdateRequiredDialog() {
        if (activity.isFinishing() || activity.isDestroyed()) {
            return;
        }

        if (fallbackDialog != null && fallbackDialog.isShowing()) {
            return;
        }

        activity.runOnUiThread(() -> {
            fallbackDialog = new AlertDialog.Builder(activity)
                    .setTitle("Update Required")
                    .setMessage("A mandatory update for Stalight Campus is required to continue using the application.")
                    .setCancelable(false)
                    .setPositiveButton("Retry", (dialog, which) -> {
                        dialog.dismiss();
                        checkForImmediateUpdate();
                    })
                    .setNegativeButton("Exit App", (dialog, which) -> {
                        dialog.dismiss();
                        activity.finishAffinity();
                    })
                    .show();
        });
    }

    private void dismissFallbackDialog() {
        if (fallbackDialog != null && fallbackDialog.isShowing()) {
            activity.runOnUiThread(() -> {
                try {
                    fallbackDialog.dismiss();
                } catch (Exception ignored) {
                }
                fallbackDialog = null;
            });
        }
    }
}
