import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const requestForToken = async () => {
    if (!messaging) return null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
          console.log('Notification permission not granted.');
          return null;
      }
      // Prefer dedicated Firebase messaging SW, fall back to combined /sw.js
      console.log('[FCM] Attempting to register firebase-messaging-sw.js (preferred)');
      let registration: ServiceWorkerRegistration | null = null;
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[FCM] Registered firebase-messaging-sw.js');
      } catch (e) {
        console.warn('[FCM] firebase-messaging-sw.js registration failed, falling back to /sw.js', e);
        console.log('[FCM] Registering service worker at /sw.js');
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      console.log('[FCM] Service worker registration:', { scope: registration.scope, active: !!registration.active });
      if (!registration.pushManager) {
        console.warn('[FCM] pushManager not available on service worker registration');
      }
      // Wait until the service worker is active and ready to handle push subscriptions
      console.log('[FCM] Waiting for service worker to become ready');
      await navigator.serviceWorker.ready;
      console.log('[FCM] navigator.serviceWorker.ready resolved');
      const opts = {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
      };
      console.log('[FCM] getToken options:', { hasVapid: !!opts.vapidKey });
      const currentToken = await getToken(messaging, opts);
      if (currentToken) {
        console.log('[FCM] Token obtained', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err: any) {
      console.error('[FCM] An error occurred while retrieving token:', { name: err?.name, message: err?.message, code: err?.code, stack: err?.stack });
      if (err && err.name === 'AbortError') {
        console.error('[FCM] AbortError detected — attempting a single SW re-register retry (unregister -> register -> getToken)');
        try {
          // Try to recover by unregistering stale service worker and re-registering once
          const existing = await navigator.serviceWorker.getRegistration();
          if (existing) {
            console.log('[FCM] Unregistering existing service worker at', existing.scope);
              await existing.unregister();
            }
            // Try re-registering dedicated firebase-messaging-sw.js first, else /sw.js
            try {
              console.log('[FCM] Re-registering firebase-messaging-sw.js (retry)');
              const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
              console.log('[FCM] New registration:', { scope: newReg.scope, active: !!newReg.active });
              const retryOpts = {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: newReg
              };
              const retryToken = await getToken(messaging, retryOpts);
              if (retryToken) {
                console.log('[FCM] Token obtained after retry');
                return retryToken;
              }
              console.warn('[FCM] Retry with firebase-messaging-sw.js did not produce a token; trying /sw.js');
            } catch (retryErr) {
              console.warn('[FCM] Re-registering firebase-messaging-sw.js failed, trying /sw.js', retryErr);
              try {
                const newReg = await navigator.serviceWorker.register('/sw.js');
                console.log('[FCM] New registration:', { scope: newReg.scope, active: !!newReg.active });
                const retryOpts = {
                  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                  serviceWorkerRegistration: newReg
                };
                const retryToken = await getToken(messaging, retryOpts);
                if (retryToken) {
                  console.log('[FCM] Token obtained after retry');
                  return retryToken;
                }
              } catch (retryErr2) {
                console.error('[FCM] Retry with /sw.js also failed', retryErr2);
              }
            }
          
        } catch (retryErr) {
          console.error('[FCM] Retry failed:', retryErr);
        }
        console.error('[FCM] AbortError likely due to browser push service rejection — check VAPID key, SW accessibility, HTTPS, and browser push availability.');
      }
      return null;
    }
  };

// Persistent foreground message listener — calls the callback every time a message arrives
export const onMessageListener = (callback: (payload: any) => void): (() => void) => {
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
        callback(payload);
    });
};

export default app;
