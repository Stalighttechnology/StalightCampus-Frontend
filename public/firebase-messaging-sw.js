importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDq9JbrlmMsYXxkb0MHfNjl2Cd9KGgmDlA",
    authDomain: "stalight-notify.firebaseapp.com",
    projectId: "stalight-notify",
    storageBucket: "stalight-notify.firebasestorage.app",
    messagingSenderId: "914862508260",
    appId: "1:914862508260:web:1e23520736d86765db04f1",
    measurementId: "G-W0R6X2J0B4"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Show notification when the app is in the BACKGROUND or tab is closed
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);
    console.log('[firebase-messaging-sw.js] Notification permission state:', Notification.permission);

    const notificationTitle = payload.data?.title || payload.notification?.title || 'StalightCampus';
    const notificationBody = payload.data?.body || payload.notification?.body || '';

    const notificationOptions = {
        body: notificationBody,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        sound: '/notification.mp3',
        tag: 'stalight-notification',
        requireInteraction: false,
        data: payload.data || {}
    };

    // Return the combined promise of showing the notification and updating client tabs
    return Promise.all([
        self.registration.showNotification(notificationTitle, notificationOptions)
            .then(() => {
                console.log('[firebase-messaging-sw.js] Notification shown successfully');
            })
            .catch((err) => {
                console.error('[firebase-messaging-sw.js] Notification display failed:', err);
            }),
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'FCM_PUSH_RECEIVED',
                    title: notificationTitle,
                    body: notificationBody
                });
            });
        })
    ]);
});
