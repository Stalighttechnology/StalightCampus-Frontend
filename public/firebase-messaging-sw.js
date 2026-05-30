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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
