import { useEffect, useState } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { API_ENDPOINT } from '../utils/config';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Module-level state to track user interaction for Autoplay compliance
let hasInteracted = false;

const setInteracted = () => {
    hasInteracted = true;
    const events = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'];
    events.forEach(event => {
        window.removeEventListener(event, setInteracted, { capture: true });
    });
};

if (typeof window !== 'undefined') {
    const events = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'];
    events.forEach(event => {
        window.addEventListener(event, setInteracted, { capture: true });
    });
}

// This hook handles requesting the FCM token, sending it to the backend, and listening for foreground messages
export const useFCM = (userToken: string | null) => {
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        // Only run if user is logged in
        if (!userToken) return;

        const registerNativePush = async () => {
            try {
                // Request permission first
                let permStatus = await PushNotifications.checkPermissions();
                
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.log('User denied native push notifications');
                    return;
                }

                // Create a high-importance Android channel for WhatsApp-like heads-up alerts
                if (Capacitor.getPlatform() === 'android') {
                    await PushNotifications.createChannel({
                        id: 'custom_sound_alerts_v2',
                        name: 'Stalight Alerts',
                        description: 'Heads-up notifications for important alerts',
                        importance: 5, // 5 = MAX (heads up + sound)
                        visibility: 1, // 1 = PUBLIC
                        vibration: true,
                        lights: true,
                        lightColor: '#2563eb',
                        sound: 'notification.mp3'
                    });
                }

                // Register with Apple / Google to receive token
                await PushNotifications.register();

                // Setup native listeners only once
                PushNotifications.addListener('registration', async (token) => {
                    setFcmToken(token.value);
                    // Send this native token to the Django backend
                    await fetch(`${API_ENDPOINT}/profile/register-device/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({
                            fcm_token: token.value,
                            device_type: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                        })
                    });
                });

                PushNotifications.addListener('registrationError', (error: any) => {
                    console.error('Error on registration: ' + JSON.stringify(error));
                });

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    // Show in-app toast notification if app is in foreground
                    playNotificationSound();
                    toast.success(`${notification.title}: ${notification.body}`, {
                        duration: 5000,
                        icon: '🔔',
                    });
                    // Refresh unread count
                    window.dispatchEvent(new CustomEvent('refresh-unread-count'));
                });

                PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                    // Triggered when user taps the notification from Android tray
                    console.log('User tapped notification', notification);
                    
                    // Clear badge if applicable
                    PushNotifications.removeAllDeliveredNotifications();
                    
                    // Open to notifications tab/refresh count
                    window.dispatchEvent(new CustomEvent('refresh-unread-count'));
                    
                    // (Optional) You can add navigation logic here:
                    // window.location.href = '/dashboard';
                });
            } catch (error) {
                console.error("Failed to initialize native Push Notifications:", error);
            }
        };

        const registerWebPush = async () => {
            try {
                const token = await requestForToken();
                if (token) {
                    setFcmToken(token);
                    // Send this token to the Django backend
                    await fetch(`${API_ENDPOINT}/profile/register-device/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({
                            fcm_token: token,
                            device_type: 'web'
                        })
                    });
                }
            } catch (error) {
                console.error("Failed to initialize Web FCM:", error);
            }
        };

        if (Capacitor.isNativePlatform()) {
            registerNativePush();
        } else {
            registerWebPush();
        }

        // Cleanup Native Listeners on Unmount
        return () => {
            if (Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
        };
    }, [userToken]);

    // Listen for custom play-sound event (so background tabs can trigger sound play)
    useEffect(() => {
        const handlePlaySound = () => {
            playNotificationSound();
        };
        window.addEventListener('play-notification-sound', handlePlaySound);
        return () => {
            window.removeEventListener('play-notification-sound', handlePlaySound);
        };
    }, []);

    // Play custom notification ringtone file
    const playNotificationSound = () => {
        if (!hasInteracted) {
            console.log('[useFCM] Notification sound skipped: waiting for user interaction.');
            return;
        }
        try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(err => {
                console.warn('Failed to play custom notification sound:', err);
            });
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    };

    // Keep the Web listener active if on the web
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            const unsubscribe = onMessageListener((payload: any) => {
                if (payload?.notification) {
                    playNotificationSound();
                    toast.success(`${payload.notification.title}: ${payload.notification.body}`, {
                        duration: 5000,
                        icon: '🔔',
                    });
                }
                window.dispatchEvent(new CustomEvent('refresh-unread-count'));
            });

            return () => {
                if (typeof unsubscribe === 'function') unsubscribe();
            };
        }
    }, []);

    return { fcmToken };
};
