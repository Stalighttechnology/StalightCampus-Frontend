// Service Worker for handling navigation fallback and Firebase Cloud Messaging (FCM)
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
    console.log('[sw.js] Background message received:', payload);
    console.log('[sw.js] Notification permission state:', Notification.permission);

    const notificationTitle = payload.data?.title || payload.notification?.title || 'StalightCampus';
    const notificationBody = payload.data?.body || payload.notification?.body || '';

    const notificationOptions = {
        body: notificationBody,
        icon: '/logo-192.png',
        sound: '/notification.mp3',
        tag: 'stalight-notification',
        requireInteraction: false,
        data: payload.data || {}
    };

    // Return the combined promise of showing the notification and updating client tabs
    return Promise.all([
        self.registration.showNotification(notificationTitle, notificationOptions)
            .then(() => {
                console.log('[sw.js] Notification shown successfully');
            })
            .catch((err) => {
                console.error('[sw.js] Notification display failed:', err);
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

const CACHE_NAME = 'neuro-frontend-v1';

self.addEventListener('install', (event) => {

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {

  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do NOT intercept or cache any /api/ routes, chrome-extensions, or non-GET requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') || 
    request.url.includes('/api/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html').then((cached) => {
          return cached || fetch('/index.html').catch(() => new Response('Offline', { status: 503 }));
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network with safe catch
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      return fetch(request).catch(() => {
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });
    })
  );
});