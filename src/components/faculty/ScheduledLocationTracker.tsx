import { useEffect, useState } from "react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export default function ScheduledLocationTracker() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only native platforms support background push notifications to wake the app
    if (!Capacitor.isNativePlatform()) {
      console.log("ScheduledLocationTracker: Running in web, push notification wakes are disabled.");
      return;
    }

    const setupPushListener = async () => {
      try {
        // Request permissions just in case
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn("Push permissions not granted, background location pings won't work.");
          return;
        }

        // Listen for silent data-only messages to trigger location pings
        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          const data = notification.data;
          
          if (data && data.action === 'PING_LOCATION' && data.scheduled_time) {
            console.log(`Silent push received: Waking up to send ping for ${data.scheduled_time}`);
            await executePing(data.scheduled_time);
          }
        });
        
        setIsReady(true);
        console.log("Location ping push listener registered.");
      } catch (error) {
        console.error("Failed to setup push listener for location pings:", error);
      }
    };

    setupPushListener();

    return () => {
      if (isReady) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [isReady]);

  const executePing = async (scheduledTimeStr: string) => {
    try {
      // Force a fresh, high accuracy coordinate fetch
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      // Send to backend
      await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/location/scheduled-ping/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          scheduled_time: scheduledTimeStr
        })
      });

      console.log(`Scheduled location ping sent successfully for ${scheduledTimeStr}`);
    } catch (error) {
      console.error(`Failed to send scheduled ping for ${scheduledTimeStr}:`, error);
    }
  };

  return null; // This is a headless component
}
