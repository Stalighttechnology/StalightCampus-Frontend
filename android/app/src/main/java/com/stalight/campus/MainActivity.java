package com.stalight.campus;

import android.os.Bundle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private InAppUpdateManager inAppUpdateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CampusGeofencePlugin.class);
        super.onCreate(savedInstanceState);

        ActivityResultLauncher<IntentSenderRequest> updateLauncher = registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    if (inAppUpdateManager != null) {
                        inAppUpdateManager.handleActivityResult(result);
                    }
                }
        );

        inAppUpdateManager = new InAppUpdateManager(this, updateLauncher);
        inAppUpdateManager.checkForImmediateUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (inAppUpdateManager != null) {
            inAppUpdateManager.resumeUpdateIfInProgress();
        }
    }
}
