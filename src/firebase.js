import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAAk_se3CWtZ2lSiNOoWNXDZqBOfgRYnIY",
  authDomain: "sentinel-5f9c1.firebaseapp.com",
  projectId: "sentinel-5f9c1",
  storageBucket: "sentinel-5f9c1.firebasestorage.app",
  messagingSenderId: "629107595024",
  appId: "1:629107595024:web:a2e9f36f81a32710c53795",
  measurementId: "G-1WNNJ96CG7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Enable offline persistence — critical for demo resilience during network drops
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Offline persistence failed: multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Offline persistence not supported in this browser");
  }
});
