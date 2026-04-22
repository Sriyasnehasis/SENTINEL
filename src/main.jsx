import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Force service worker update check with version param
    navigator.serviceWorker.register("/sw.js?v=2")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);
      })
      .catch((error) => {
        console.error("[SW] Registration failed:", error);
      });
  });
}
