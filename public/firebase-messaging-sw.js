// Firebase Cloud Messaging Service Worker
// Handles background push notifications for staff devices

importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyAAk_se3CWtZ2lSiNOoWNXDZqBOfgRYnIY",
  authDomain: "sentinel-5f9c1.firebaseapp.com",
  projectId: "sentinel-5f9c1",
  storageBucket: "sentinel-5f9c1.firebasestorage.app",
  messagingSenderId: "629107595024",
  appId: "1:629107595024:web:a2e9f36f81a32710c53795",
  measurementId: "G-1WNNJ96CG7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle = payload.notification?.title || "SENTINEL Alert";
  const notificationOptions = {
    body: payload.notification?.body || "New emergency alert",
    icon: "/icons.svg",
    badge: "/icons.svg",
    vibrate: [200, 100, 200, 100, 200], // Haptic pattern for accessibility
    tag: payload.data?.severity || "sentinel-alert",
    requireInteraction: true,
    actions: [
      { action: "view", title: "View Dashboard" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click received.");
  event.notification.close();

  if (event.action === "view") {
    // Open dashboard when user clicks "View Dashboard"
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
    );
  }
});
