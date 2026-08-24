package com.stalight.campus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CampusGeofencePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
