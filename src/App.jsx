import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db, messaging, VAPID_KEY } from "./firebase";

/**
 * FCM Token Registration
 * ─────────────────────
 * Requests browser notification permission, generates an FCM token,
 * and saves it to Firestore /staff/{uid} so the FCM dispatcher can
 * send push notifications to this device on P0 incidents.
 *
 * Runs once after the user logs in (detected via onAuthStateChanged).
 */
async function registerFCMToken(user) {
  if (!VAPID_KEY) {
    console.warn("⚠️ VITE_FIREBASE_VAPID_KEY not set — FCM push disabled");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("🔕 Notification permission denied");
      return;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn("⚠️ FCM token is empty — check VAPID key");
      return;
    }

    // Save token to Firestore /staff/{uid}
    await setDoc(
      doc(db, "staff", user.uid),
      {
        fcm_token:            token,
        fcm_registered_at:    new Date().toISOString(),
        email:                user.email,
        display_name:         user.displayName || user.email,
      },
      { merge: true }
    );

    console.log("✅ FCM token registered for", user.email);
  } catch (err) {
    // Non-fatal: app works without FCM, just no push notifications
    console.warn("FCM registration error (non-fatal):", err.message);
  }
}

function App() {
  useEffect(() => {
    // Wait for Firebase Auth to resolve before registering FCM
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      registerFCMToken(user);
    });

    // Handle foreground FCM messages (app is open)
    let unsubscribeMsg = () => {};
    try {
      unsubscribeMsg = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "SENTINEL Alert";
        const body  = payload.notification?.body  || "Emergency alert received";
        console.log("📱 Foreground FCM:", title);

        // Show a native notification even when the app tab is open
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon:               "/icons.svg",
            badge:              "/icons.svg",
            requireInteraction: true,
            tag:                "sentinel-alert",
          });
        }
      });
    } catch (e) {
      console.warn("FCM onMessage setup error (non-fatal):", e.message);
    }

    return () => {
      unsubscribe();
      unsubscribeMsg();
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
