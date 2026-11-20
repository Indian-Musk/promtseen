// public/sw.js

// Import Firebase App and Messaging (use importScripts for compatibility)
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASLUfnN4lLtI4GqE9QK3JyWjh2HeS8wsE",
  authDomain: "promtseen-42a38.firebaseapp.com",
  projectId: "promtseen-42a38",
  storageBucket: "promtseen-42a38.firebasestorage.app",
  messagingSenderId: "620714446859",
  appId: "1:620714446859:web:019bb7a7e00248e3d6770e",
  measurementId: "G-PW4Z50GV4H"
};

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Tools Prompt';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New update!',
    icon: payload.notification?.icon || '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Try to focus an existing tab
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        // If no tab, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});