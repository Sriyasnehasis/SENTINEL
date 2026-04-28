<div align="center">
  <img src="https://img.shields.io/badge/Google_Solution_Challenge-Hack2Skill-blue?style=for-the-badge&logo=google" alt="Google Solution Challenge" />
  <img src="https://img.shields.io/badge/Gemini_2.0_Flash-AI_Integration-orange?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Firebase-Serverless-yellow?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react" alt="React" />
</div>

<br />

<div align="center">
  <h1>🚨 SENTINEL</h1>
  <h3>Smart Emergency Network for Tactical Intelligence & Life-saving</h3>
  <p>A real-time AI-powered crisis management system that transforms chaos into coordinated emergency response.</p>
</div>

---

## 👥 Team Details
*   **Team Name:** Anavrin
*   **Team Leader:** Sujal Barwad
*   **Built For:** Google Solution Challenge (via Hack2Skill)

## 🎯 Problem Statement
Design a robust system to instantly detect, report, and synchronize crisis response across a decentralized hospitality ecosystem. 

Current systems suffer from:
*   ❌ Fragmented communication
*   ❌ No real-time coordination
*   ❌ Lack of intelligent evacuation guidance

## 💡 Solution Overview
**SENTINEL** is a high-stakes emergency management platform designed for complex, multi-floor structures where every second counts. It converts emergencies into a structured, real-time response loop by connecting guests in distress, emergency responders, and an AI-driven intelligence system.

### 🔁 The Crisis Processing Loop
1.  **1️⃣ Detection:** Picks up a crisis from IoT sensors (smoke/fire detectors), Voice reports via a Dialogflow AI agent, or User SOS requests via the PWA.
2.  **2️⃣ Intelligence (The AI Brain):** Once an incident hits the database, Gemini 2.0 Flash analyzes the full floor plan, classifies severity (P0/P1/P2), identifies safe vs. blocked exits, and uses Dijkstra’s Algorithm for optimal routing.
3.  **3️⃣ Response:** Instantly pushes calculated paths to the frontend, blasts Push alerts via Firebase Cloud Messaging (FCM), and provides Multilingual voice guidance (TTS).

---

## ✨ Key Features
*   🔥 **Real-time Detection:** Immediate response to IoT fire/smoke triggers.
*   🗺️ **Dynamic Evacuation Routing:** Dijkstra's algorithm computes the safest path live as fires spread.
*   🧠 **AI-Generated Intelligence:** Gemini generates a Situation Report (SitRep) in milliseconds.
*   🌍 **Multilingual Alerts:** Instant Text-to-Speech (TTS) announcements in 4 languages (EN, HI, FR, ES).
*   🆘 **One-Tap SOS:** Guests can trigger direct rescue requests.
*   ♿ **Mobility-Impaired Detection:** AI automatically flags mobility-impaired guests during an evacuation.
*   🧑‍🚒 **Tactical Command Center:** Admin dashboard styled like a professional military HUD, not a standard website.
*   🌐 **Offline-Capable:** Aggressive Service Worker caching ensures the app works during network drops.
*   🏢 **Interactive 3D Building Model:** Real-time facility visualization using Three.js / React Three Fiber.

---

## 🚀 Unique Selling Proposition (USP)
✅ **The Only Solution** combining IoT + Voice AI + Gemini recommended procedures + live evacuation routing in a single system.<br/>
✅ **Zero-Cost Deployment** using the Google Cloud free-tier, removing the #1 barrier for small/mid-size properties.<br/>
✅ **Mobility-Aware Planning** baked into the AI output—no other hotel safety tool does this automatically.<br/>
✅ **Multilingual Voice Alerts** to serve international guests that competitors completely ignore.<br/>

### 📊 Why It’s Different
| Traditional Systems | SENTINEL |
| :--- | :--- |
| Only alarms 🔔 | Full AI situational awareness 🧠 |
| No evacuation guidance | Smart routing 🗺️ |
| Fragmented systems | Unified real-time pipeline 🔗 |
| No multilingual support | Multi-language voice alerts 🌍 |

---

## 🛠️ Tech Stack

**🎨 Frontend**
*   **React + Vite:** PWA dashboard for admin & guests.
*   **Three.js / React Three Fiber:** Interactive 3D routing & satellite mapping.
*   **Service Worker:** Offline caching for crisis resilience.

**🧠 AI & Voice**
*   **Gemini 2.0 Flash:** Situational intelligence & SitRep generation.
*   **Dialogflow CX:** Voice-to-incident NLP (extracts floor/zone/room).
*   **Web Speech API:** Zero-latency multilingual audio announcements.

**⚙️ Backend & Infrastructure**
*   **Python Flask & Google Cloud Run:** Event processor & REST API.
*   **Google Cloud Pub/Sub:** Real-time event bus for sensor data.
*   **Cloud Functions Gen2:** Gemini triggers + FCM dispatcher.
*   **Firebase Ecosystem:** Firestore (Real-time NoSQL), Firebase Auth, Firebase Hosting, Firebase Cloud Messaging.

---

## 📂 Project Structure

```text
SENTINEL/
├── backend/                  # Serverless Python backend
│   ├── cloud-functions/      # Firebase Gen 2 Cloud Functions
│   │   ├── fcm-dispatcher/   # Sends Push Notifications via FCM
│   │   └── gemini-trigger/   # Generates SitRep via Gemini 2.0 Flash
│   ├── event-processor/      # Flask API on Cloud Run (Pub/Sub ingest)
│   └── iot-simulator/        # Simulates IoT fire/smoke sensors
├── docs/                     # Project documentation & Architecture
├── public/                   # Static assets (3D models, floor plans)
├── src/                      # React Frontend Source Code
│   ├── components/           # UI elements (Maps, SitRep, Tables)
│   ├── context/              # React Context (Auth)
│   ├── data/                 # Mock JSON data
│   ├── pages/                # Main views (Home, Login, Landing)
│   ├── utils/                # Dijkstra routing and Graph logic
│   ├── App.jsx               # App routing and FCM logic
│   ├── firebase.js           # Firebase init & offline caching
│   └── main.jsx              # React entry point & PWA Service Worker
├── DEPLOYMENT_GUIDE.md       # Setup & Deployment instructions
├── firestore.rules           # Security rules for Firebase Database
└── package.json              # Frontend dependencies
```

---

## 🔮 Future Scope
*   **Advanced AI Reasoning:** Integration with Gemini 2.0 Pro for multi-incident correlation to distinguish between isolated glitches and structural threats.
*   **Auto-Reporting:** Instant, AI-generated post-incident summaries for safety audits and compliance teams.
*   **V2V Incident Debriefing:** Allow admins to verbally query historical logs (e.g., "Summarize the East Wing fire") for hands-free analysis.
*   **Omni-Channel Accessibility:** Full Flutter mobile app integration with 10+ language support via Google Cloud Translation.

---

## 🚀 Live Links
*   🔗 **GitHub Repository:** [https://github.com/Sriyasnehasis/SENTINEL](https://github.com/Sriyasnehasis/SENTINEL)
*   🎥 **Demo Video:** [Watch on YouTube](https://www.youtube.com/watch?v=Pxr5j-wKVnw)
*   🎨 **MVP (Figma Design):** [View Wireframes](https://www.figma.com/design/h8OlPsMmYAm5QH2S0JwXSV/Sentinel-Wireframes)
*   🌐 **Working Prototype:** [Live Application](https://sentinel-hq-ops.web.app/landing)

---

> ❤️ **Final Note:** SENTINEL is built for worst-case scenarios, where every second matters. It aims to save lives using AI, real-time systems, and intelligent coordination.
