#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CampusGeofencePlugin, "CampusGeofence",
    CAP_PLUGIN_METHOD(requestGeofencePermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(addGeofence, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(removeGeofences, CAPPluginReturnPromise);
)
