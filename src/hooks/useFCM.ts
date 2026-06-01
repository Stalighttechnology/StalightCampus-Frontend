import { useEffect, useState } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { API_ENDPOINT } from '../utils/config';

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

        const initializeFCM = async () => {
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
                console.error("Failed to initialize FCM:", error);
            }
        };

        initializeFCM();
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
        // If the user has not interacted with the page yet, skip playing the sound
        // to avoid browser security warnings.
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

    useEffect(() => {
        // Persistent foreground message listener — fires every time, not just once
        const unsubscribe = onMessageListener((payload: any) => {
            if (payload?.notification) {
                // Play custom notification chime
                playNotificationSound();

                // Show in-app toast notification
                toast.success(`${payload.notification.title}: ${payload.notification.body}`, {
                    duration: 5000,
                    icon: '🔔',
                });
            }
            // Immediately refresh the bell badge count in the navbar
            window.dispatchEvent(new CustomEvent('refresh-unread-count'));
        });

        return () => {
            // Cleanup listener on unmount
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    return { fcmToken };
};
