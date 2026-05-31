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
      // Explicitly register/get our combined service worker (caching + FCM)
      const registration = await navigator.serviceWorker.register('/sw.js');
      const currentToken = await getToken(messaging, { 
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err: any) {
      console.error('An error occurred while retrieving token:', err);
      if (err && err.message) {
        console.error('Error message:', err.message);
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
