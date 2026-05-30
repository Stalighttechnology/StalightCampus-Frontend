import { useEffect, useState } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { toast } from 'react-hot-toast'; // or sonner, depending on what the app uses

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
                    await fetch('http://localhost:8000/api/profile/register-device/', {
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

    useEffect(() => {
        // Listen for foreground messages
        onMessageListener().then((payload: any) => {
            if (payload && payload.notification) {
                toast.success(`${payload.notification.title}: ${payload.notification.body}`);
            }
        }).catch(err => console.log('failed: ', err));
    }, []);

    return { fcmToken };
};
