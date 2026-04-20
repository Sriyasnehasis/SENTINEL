# SENTINEL — Architecture & Build Guide
> Smart Emergency Network for Tactical Intelligence & Life-saving  
> Google Solution Challenge 2026 | Hack2Skills  
> Stack: 100% Google Cloud + Firebase Free Tier | Budget: $0  
> Submission Deadline: April 28, 2026

---

## 0. Pre-Build Checklist (Day 0 — Do This Before Any Code)

- [ ] Create GCP project: `sentinel-crisis-2026`
- [ ] Enable APIs: Cloud Run, Pub/Sub, Firestore, Cloud Functions, Speech-to-Text, Text-to-Speech, Maps JS API, Firebase Cloud Messaging, Vertex AI (Gemini)
- [ ] Register for Google Solution Challenge to receive $500 GCP credits
- [ ] Install: Node 20+, Python 3.11+, Firebase CLI, Google Cloud CLI (`gcloud`)
- [ ] Run `gcloud auth application-default login`
- [ ] Create Firebase project linked to same GCP project
- [ ] Validate Gemini prompt in **AI Studio (aistudio.google.com)** before writing any Cloud Function code — this is the single highest-risk assumption
- [ ] Lock and document the canonical CrisisEvent JSON schema (see Section 1) before any team member writes a single line of code
- [ ] Draw fictional hotel floor plan in Google Slides → export as PNG → commit to repo as `public/assets/floor_plan.png`
- [ ] Create `guests.json` mock file with 10 fake guests (see schema in Section 1) — assign ownership to Integration Lead

---

## 1. Canonical Data Schemas (Team Contract — Never Break These)

### 1.1 CrisisEvent (Pub/Sub message body and Firestore document)

```json
{
  "event_id": "uuid-v4-string",
  "incident_id": "uuid-v4-string",
  "timestamp": "2026-04-19T10:00:00Z",
  "source_type": "IOT_SENSOR | VOICE_DIALOGFLOW | STAFF_APP | VIDEO_AI",
  "event_type": "FIRE | SMOKE | TRAPPED | INJURY | MEDICAL | PANIC",
  "location": {
    "floor": 4,
    "zone": "East Wing",
    "room": "412"
  },
  "confidence": 0.93,
  "status": "ACTIVE | RESOLVED | INVESTIGATING",
  "ai_report": null
}
```

### 1.2 Gemini SitRep JSON Output Schema (enforce via response_schema)

```json
{
  "severity": "P0 | P1 | P2",
  "threat_summary": "string",
  "affected_floors": [4, 5, 6],
  "safe_exits": ["Staircase B", "Staircase D"],
  "blocked_exits": ["Staircase C"],
  "mobility_impaired_flagged": ["Room 412", "Room 308"],
  "recommended_actions": ["string"],
  "zone_scores": {
    "4-EastWing": 9,
    "4-WestWing": 3
  }
}
```

### 1.3 Mock Guest Data (`/src/data/guests.json`)

```json
[
  {
    "guest_id": "g001",
    "name": "Aiko Tanaka",
    "room": "412",
    "floor": 4,
    "language": "ja",
    "mobility_impaired": true,
    "fcm_token": "mock_token_001"
  }
]
```
> Include 10 guests across floors 3–6, mix of languages (en, hi, ja, fr, es), 2 mobility-impaired.

### 1.4 Building Graph (JavaScript adjacency list for routing)

```javascript
const buildingGraph = {
  "4-EastWing":   { "StaircaseB": 1, "StaircaseC": 1, "4-WestWing": 2 },
  "4-WestWing":   { "StaircaseD": 1, "4-EastWing": 2 },
  "StaircaseB":   { "GroundFloor": 4, "4-EastWing": 1 },
  "StaircaseC":   { "GroundFloor": 4, "4-EastWing": 1 },
  "StaircaseD":   { "GroundFloor": 4, "4-WestWing": 1 },
  "GroundFloor":  { "AssemblyPoint": 1 }
};
// When fire detected in a zone: set all edges FROM that zone to Infinity
// Rerun Dijkstra from every occupied floor zone to AssemblyPoint
```

---

## 2. Repository Structure

```
sentinel/
├── backend/
│   ├── iot-simulator/          # Python — pushes fake events to Pub/Sub
│   │   └── simulator.py
│   ├── event-processor/        # Python Flask — Cloud Run service
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── cloud-functions/
│       ├── gemini-trigger/     # Triggered on Firestore write
│       │   └── main.py
│       └── fcm-dispatcher/     # Triggered on P0 incident
│           └── main.py
├── frontend/
│   ├── public/
│   │   └── assets/
│   │       └── floor_plan.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── IncidentTable.jsx
│   │   │   ├── LiveMap.jsx
│   │   │   ├── SitRepPanel.jsx
│   │   │   ├── ZoneClearButton.jsx
│   │   │   └── DialogflowWidget.jsx
│   │   ├── data/
│   │   │   └── guests.json
│   │   ├── utils/
│   │   │   ├── dijkstra.js
│   │   │   └── buildingGraph.js
│   │   ├── firebase.js
│   │   └── App.jsx
│   ├── firebase.json
│   └── package.json
├── dialogflow/
│   └── agent-export.zip        # Exported Dialogflow CX agent
├── docs/
│   └── SENTINEL_ARCHITECTURE.md  # This file
└── .github/
    └── workflows/
        └── deploy.yml           # Cloud Build CI/CD
```

---

## 3. Firestore Collections Structure

```
/incidents/{incident_id}
  - All CrisisEvent fields
  - ai_report: {} (written by Gemini Cloud Function after creation)
  - created_at: Timestamp
  - updated_at: Timestamp

/staff/{staff_id}
  - name: string
  - zone_assigned: string
  - zone_cleared: boolean
  - fcm_token: string
  - last_seen: Timestamp

/sessions/{session_id}           ← Shared Agent State
  - active_incidents: [incident_id]
  - blocked_exits: [string]
  - safe_exits: [string]
  - current_sitrep: {}
  - last_updated: Timestamp
```

**Firestore Security Rules (paste into Firebase console):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /incidents/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'system' || request.auth.token.role == 'staff';
    }
    match /staff/{id} {
      allow read, write: if request.auth != null && request.auth.uid == id;
    }
    match /sessions/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'system';
    }
  }
}
```

---

## 4. Phase 1 — Data Pipeline (Weeks 1–2)
**Owner: Cloud Architect (Member 1)**  
**Goal: Sensor event appears in React dashboard within 500ms. Zero AI. Zero Maps.**

### Step 1.1 — Pub/Sub Setup
```bash
gcloud pubsub topics create sentinel-events-raw
gcloud pubsub subscriptions create sentinel-processor-sub \
  --topic=sentinel-events-raw \
  --push-endpoint=https://[CLOUD_RUN_URL]/ingest \
  --ack-deadline=30
```

### Step 1.2 — IoT Simulator (`backend/iot-simulator/simulator.py`)
```python
import json, uuid, time, random
from google.cloud import pubsub_v1
from datetime import datetime, timezone

PROJECT_ID = "sentinel-crisis-2026"
TOPIC_ID = "sentinel-events-raw"

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)

EVENT_TYPES = ["FIRE", "SMOKE", "TRAPPED", "MEDICAL"]
ZONES = ["East Wing", "West Wing", "North Corridor"]
FLOORS = [3, 4, 5, 6]
ROOMS = ["301","312","401","412","501","511","601"]

def generate_event():
    return {
        "event_id": str(uuid.uuid4()),
        "incident_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "IOT_SENSOR",
        "event_type": random.choice(EVENT_TYPES),
        "location": {
            "floor": random.choice(FLOORS),
            "zone": random.choice(ZONES),
            "room": random.choice(ROOMS)
        },
        "confidence": round(random.uniform(0.7, 0.99), 2),
        "status": "ACTIVE",
        "ai_report": None
    }

while True:
    event = generate_event()
    data = json.dumps(event).encode("utf-8")
    future = publisher.publish(topic_path, data)
    print(f"Published: {event['event_type']} on Floor {event['location']['floor']}")
    time.sleep(5)
```
Run locally: `python simulator.py`

### Step 1.3 — Event Processor Cloud Run Service (`backend/event-processor/main.py`)
```python
import json, os
from flask import Flask, request, jsonify
from google.cloud import firestore

app = Flask(__name__)
db = firestore.Client()

@app.route("/ingest", methods=["POST"])
def ingest():
    envelope = request.get_json()
    if not envelope or "message" not in envelope:
        return jsonify({"error": "bad request"}), 400
    
    import base64
    message_data = base64.b64decode(envelope["message"]["data"]).decode("utf-8")
    event = json.loads(message_data)
    
    # Validate required fields
    required = ["event_id", "incident_id", "event_type", "location", "confidence"]
    if not all(k in event for k in required):
        return jsonify({"error": "invalid schema"}), 400
    
    # Write to Firestore
    db.collection("incidents").document(event["incident_id"]).set(event)
    print(f"Stored incident: {event['incident_id']}")
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

**requirements.txt:**
```
flask==3.0.0
google-cloud-firestore==2.16.0
google-cloud-pubsub==2.21.0
```

**Deploy:**
```bash
cd backend/event-processor
gcloud run deploy sentinel-processor \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=sentinel-crisis-2026
```

### Step 1.4 — React Dashboard Bootstrap
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install firebase react-firebase-hooks
```

**`src/firebase.js`:**
```javascript
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  // Paste from Firebase console → Project Settings → Your apps
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Enable offline persistence (critical for demo resilience)
enableIndexedDbPersistence(db).catch(console.error);
```

**`src/components/IncidentTable.jsx`:**
```jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";

export default function IncidentTable() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(q, snap => {
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const statusColor = { FIRE: "#F44336", SMOKE: "#FF9800", TRAPPED: "#2196F3", MEDICAL: "#9C27B0" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#050E1F", color: "white" }}>
          <th>Type</th><th>Floor</th><th>Zone</th><th>Room</th><th>Confidence</th><th>Status</th><th>Time</th>
        </tr>
      </thead>
      <tbody>
        {incidents.map(inc => (
          <tr key={inc.id} style={{ borderBottom: "1px solid #dde4f0" }}>
            <td style={{ color: statusColor[inc.event_type] || "#333", fontWeight: 700 }}>{inc.event_type}</td>
            <td>{inc.location?.floor}</td>
            <td>{inc.location?.zone}</td>
            <td>{inc.location?.room}</td>
            <td>{(inc.confidence * 100).toFixed(0)}%</td>
            <td>{inc.status}</td>
            <td>{new Date(inc.timestamp).toLocaleTimeString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Phase 1 Done Criteria:** Simulator runs → events appear in table within 500ms → Firestore console shows documents populating.

---

## 5. Phase 2 — AI Core + Voice (Weeks 3–4)
**Owner: AI/ML Lead (Member 2)**  
**Goal: Gemini generates JSON SitRep on every new incident. Dialogflow CX processes voice input.**

### Step 2.1 — Validate Gemini Prompt in AI Studio FIRST

Before writing any Cloud Function code, go to https://aistudio.google.com and test this exact prompt:

**System Prompt (keep under 500 tokens):**
```
You are SENTINEL's Root AI Agent for emergency crisis response.
You receive a JSON array of active incidents from a hotel emergency system.
You must respond ONLY with a valid JSON object matching this exact schema — no preamble, no explanation:
{
  "severity": "P0|P1|P2",
  "threat_summary": "string",
  "affected_floors": [integer],
  "safe_exits": ["string"],
  "blocked_exits": ["string"],
  "mobility_impaired_flagged": ["Room string"],
  "recommended_actions": ["string"],
  "zone_scores": {"zone_name": integer_0_to_10}
}
P0 = immediate threat to life. P1 = high risk. P2 = monitor only.
Zone scores: 10 = fire confirmed, 7-9 = smoke/high risk, 4-6 = possible hazard, 0-3 = safe.
```

**User Message (test with this):**
```json
[
  {"event_type":"FIRE","location":{"floor":4,"zone":"East Wing","room":"412"},"confidence":0.93,"status":"ACTIVE"},
  {"event_type":"SMOKE","location":{"floor":4,"zone":"East Wing","room":"408"},"confidence":0.85,"status":"ACTIVE"},
  {"event_type":"TRAPPED","location":{"floor":4,"zone":"East Wing","room":"412"},"confidence":0.78,"status":"ACTIVE"}
]
```

Iterate until output is clean parseable JSON. Save final prompt text to `docs/gemini_prompt.txt`.

### Step 2.2 — Gemini Cloud Function (`backend/cloud-functions/gemini-trigger/main.py`)
```python
import functions_framework
import json, os
from google.cloud import firestore
import google.generativeai as genai

db = firestore.Client()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# Rate limit state (in-memory debounce)
import time
last_gemini_call = 0
DEBOUNCE_SECONDS = 12  # Stay under 15 RPM free tier

SYSTEM_PROMPT = open("system_prompt.txt").read()

@functions_framework.cloud_event
def on_incident_created(cloud_event):
    global last_gemini_call
    
    # Debounce
    now = time.time()
    if now - last_gemini_call < DEBOUNCE_SECONDS:
        print("Debounced — skipping Gemini call")
        return
    last_gemini_call = now
    
    # Fetch all active incidents
    incidents = []
    docs = db.collection("incidents").where("status", "==", "ACTIVE").stream()
    for doc in docs:
        d = doc.to_dict()
        incidents.append({
            "event_type": d.get("event_type"),
            "location": d.get("location"),
            "confidence": d.get("confidence"),
            "status": d.get("status")
        })
    
    if not incidents:
        return
    
    # Load guests for mobility-impaired context
    with open("guests.json") as f:
        guests = json.load(f)
    
    mobility_context = [
        f"Room {g['room']} Floor {g['floor']}"
        for g in guests if g.get("mobility_impaired")
    ]
    
    user_message = f"""
Active incidents: {json.dumps(incidents)}
Mobility-impaired guest rooms: {mobility_context}
Known exits: Staircase A (West), Staircase B (East), Staircase C (North), Staircase D (South)
"""
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        response = model.generate_content(user_message)
        sitrep = json.loads(response.text)
        
        # Write SitRep to shared session document
        db.collection("sessions").document("current").set({
            "current_sitrep": sitrep,
            "active_incidents": [inc["event_type"] for inc in incidents],
            "last_updated": firestore.SERVER_TIMESTAMP,
            "blocked_exits": sitrep.get("blocked_exits", []),
            "safe_exits": sitrep.get("safe_exits", [])
        }, merge=True)
        
        print(f"SitRep generated: {sitrep['severity']} — {sitrep['threat_summary']}")
    
    except Exception as e:
        print(f"Gemini error: {e}")
        # Fallback: write a cached/stale indicator
        db.collection("sessions").document("current").set({
            "sitrep_error": str(e),
            "last_updated": firestore.SERVER_TIMESTAMP
        }, merge=True)
```

**Deploy Cloud Function:**
```bash
gcloud functions deploy sentinel-gemini-trigger \
  --gen2 \
  --runtime python311 \
  --region asia-south1 \
  --source backend/cloud-functions/gemini-trigger \
  --entry-point on_incident_created \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters-path-pattern="document=incidents/{incidentId}" \
  --set-env-vars GEMINI_API_KEY=[YOUR_KEY]
```

### Step 2.3 — Dialogflow CX Setup

1. Go to https://dialogflow.cloud.google.com/cx
2. Create agent: `SENTINEL-Agent`, region: `global`, language: English
3. Create these 3 intents under Default Start Flow:

**Intent: FIRE_REPORT**
- Training phrases: "fire on floor 4", "I see smoke on floor 3 east wing", "there's a fire in room 412", "flames in the corridor"
- Parameters: `floor` (sys.number), `zone` (sys.any), `room` (sys.number)
- Fulfillment: Enable webhook → Cloud Run URL `/dialogflow-webhook`

**Intent: PERSON_TRAPPED**
- Training phrases: "someone is trapped in room 308", "I'm stuck on floor 5", "people can't get out of east wing"
- Parameters: `floor` (sys.number), `room` (sys.number), `person_count` (sys.number)

**Intent: MEDICAL**
- Training phrases: "someone is injured on floor 4", "there's an unconscious person in room 412", "medical emergency floor 6"
- Parameters: `floor` (sys.number), `room` (sys.number)

4. Add Webhook in Dialogflow CX console → URL: `https://[CLOUD_RUN_URL]/dialogflow-webhook`

**Webhook handler (add to `backend/event-processor/main.py`):**
```python
@app.route("/dialogflow-webhook", methods=["POST"])
def dialogflow_webhook():
    body = request.get_json()
    intent = body["intentInfo"]["displayName"]
    params = body.get("sessionInfo", {}).get("parameters", {})
    
    intent_to_event = {
        "FIRE_REPORT": "FIRE",
        "PERSON_TRAPPED": "TRAPPED",
        "MEDICAL": "MEDICAL"
    }
    
    event = {
        "event_id": str(uuid.uuid4()),
        "incident_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "VOICE_DIALOGFLOW",
        "event_type": intent_to_event.get(intent, "UNKNOWN"),
        "location": {
            "floor": int(params.get("floor", {}).get("numberValue", 0)),
            "zone": str(params.get("zone", {}).get("stringValue", "Unknown")),
            "room": str(params.get("room", {}).get("numberValue", "Unknown"))
        },
        "confidence": 0.85,
        "status": "ACTIVE",
        "ai_report": None
    }
    
    db.collection("incidents").document(event["incident_id"]).set(event)
    
    return jsonify({
        "fulfillment_response": {
            "messages": [{"text": {"text": [f"Alert received. {event['event_type']} reported on Floor {event['location']['floor']}. Emergency response initiated."]}}]
        }
    })
```

**Embed Dialogflow Messenger in React PWA (`src/components/DialogflowWidget.jsx`):**
```jsx
import { useEffect } from "react";

export default function DialogflowWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <df-messenger
      intent="WELCOME"
      chat-title="SENTINEL Voice Report"
      agent-id="[YOUR_DIALOGFLOW_CX_AGENT_ID]"
      language-code="en"
    />
  );
}
```

### Step 2.4 — SitRep Panel (`src/components/SitRepPanel.jsx`)
```jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function SitRepPanel() {
  const [sitrep, setSitrep] = useState(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "sessions", "current"), snap => {
      const data = snap.data();
      if (data?.sitrep_error) { setStale(true); return; }
      if (data?.current_sitrep) { setSitrep(data.current_sitrep); setStale(false); }
    });
  }, []);

  if (!sitrep) return <p>Awaiting AI situation report...</p>;

  const severityColor = { P0: "#F44336", P1: "#FF9800", P2: "#2196F3" };

  return (
    <div style={{ border: `2px solid ${severityColor[sitrep.severity]}`, borderRadius: 8, padding: 16 }}>
      {stale && <p style={{ color: "#FF9800" }}>⚠ Showing last cached report</p>}
      <h2 style={{ color: severityColor[sitrep.severity] }}>SEVERITY: {sitrep.severity}</h2>
      <p><strong>Summary:</strong> {sitrep.threat_summary}</p>
      <p><strong>Safe Exits:</strong> {sitrep.safe_exits?.join(", ")}</p>
      <p><strong>Blocked Exits:</strong> {sitrep.blocked_exits?.join(", ")}</p>
      <p><strong>Affected Floors:</strong> {sitrep.affected_floors?.join(", ")}</p>
      {sitrep.mobility_impaired_flagged?.length > 0 && (
        <p style={{ color: "#F44336" }}><strong>⚠ Mobility-impaired:</strong> {sitrep.mobility_impaired_flagged.join(", ")}</p>
      )}
      <ul>{sitrep.recommended_actions?.map((a, i) => <li key={i}>{a}</li>)}</ul>
    </div>
  );
}
```

**Phase 2 Done Criteria:** Speak into browser → Dialogflow extracts floor/room → incident appears in table → within 12 seconds, SitRep panel populates with Gemini JSON.

---

## 6. Phase 3 — Maps + Evacuation Routing (Weeks 5–6)
**Owner: GIS/Maps Wizard (Member 3)**  
**Goal: Live Google Map with colored incident markers, floor plan overlay, and dynamic Dijkstra evacuation routes.**

### Step 3.1 — Google Maps JS API Setup

Enable Maps JavaScript API in GCP console. Get API key (restrict to your domain in production).

```bash
npm install @vis.gl/react-google-maps
```

**`src/utils/buildingGraph.js`:**
```javascript
export const buildingGraph = {
  "4-EastWing":    { "StaircaseB": 1, "StaircaseC": 1, "4-WestWing": 2 },
  "4-WestWing":    { "StaircaseD": 1, "4-EastWing": 2 },
  "3-EastWing":    { "StaircaseB": 1, "StaircaseC": 1, "3-WestWing": 2 },
  "3-WestWing":    { "StaircaseD": 1, "3-EastWing": 2 },
  "5-EastWing":    { "StaircaseB": 1, "StaircaseC": 1, "5-WestWing": 2 },
  "5-WestWing":    { "StaircaseD": 1, "5-EastWing": 2 },
  "StaircaseA":    { "GroundFloor": 4 },
  "StaircaseB":    { "GroundFloor": 4, "4-EastWing": 1, "3-EastWing": 1, "5-EastWing": 1 },
  "StaircaseC":    { "GroundFloor": 4, "4-EastWing": 1, "3-EastWing": 1 },
  "StaircaseD":    { "GroundFloor": 4, "4-WestWing": 1, "3-WestWing": 1, "5-WestWing": 1 },
  "GroundFloor":   { "AssemblyPoint": 1 },
  "AssemblyPoint": {}
};

// Zone → approximate lat/lng mapping for your fictional hotel location
export const zoneCoordinates = {
  "4-EastWing":    { lat: 19.0761, lng: 72.8775 },
  "4-WestWing":    { lat: 19.0758, lng: 72.8772 },
  "3-EastWing":    { lat: 19.0762, lng: 72.8775 },
  "3-WestWing":    { lat: 19.0759, lng: 72.8772 },
  "5-EastWing":    { lat: 19.0760, lng: 72.8776 },
  "StaircaseB":    { lat: 19.0763, lng: 72.8774 },
  "StaircaseC":    { lat: 19.0764, lng: 72.8773 },
  "StaircaseD":    { lat: 19.0757, lng: 72.8771 },
  "AssemblyPoint": { lat: 19.0765, lng: 72.8778 }
};
```

**`src/utils/dijkstra.js`:**
```javascript
export function dijkstra(graph, start, end, blockedNodes = []) {
  const distances = {};
  const visited = new Set();
  const prev = {};
  
  // Initialize
  Object.keys(graph).forEach(node => distances[node] = Infinity);
  distances[start] = 0;
  
  const pq = [[0, start]];
  
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [dist, node] = pq.shift();
    
    if (visited.has(node)) continue;
    visited.add(node);
    
    if (node === end) break;
    
    const neighbors = graph[node] || {};
    for (const [neighbor, weight] of Object.entries(neighbors)) {
      if (blockedNodes.includes(neighbor)) continue;
      const newDist = dist + weight;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        prev[neighbor] = node;
        pq.push([newDist, neighbor]);
      }
    }
  }
  
  // Reconstruct path
  const path = [];
  let current = end;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }
  
  return path[0] === start ? path : [];
}

export function getBlockedNodes(incidents) {
  // Block nodes where FIRE confidence > 0.8
  return incidents
    .filter(inc => inc.event_type === "FIRE" && inc.confidence > 0.8)
    .map(inc => `${inc.location.floor}-${inc.location.zone.replace(" ", "")}`);
}
```

### Step 3.2 — Live Map Component (`src/components/LiveMap.jsx`)
```jsx
import { useEffect, useState } from "react";
import { APIProvider, Map, Marker, Polyline, GroundOverlay } from "@vis.gl/react-google-maps";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { dijkstra, getBlockedNodes } from "../utils/dijkstra";
import { buildingGraph, zoneCoordinates } from "../utils/buildingGraph";

const MAPS_API_KEY = "[YOUR_MAPS_API_KEY]";
const HOTEL_CENTER = { lat: 19.0761, lng: 72.8774 };

// Floor plan image bounds — adjust to match your exported floor_plan.png coordinates
const FLOOR_PLAN_BOUNDS = {
  north: 19.0766, south: 19.0756,
  east: 72.8780, west: 72.8770
};

const EVENT_COLORS = {
  FIRE: "#F44336",
  SMOKE: "#FF9800",
  TRAPPED: "#2196F3",
  MEDICAL: "#9C27B0",
  INJURY: "#FF5722"
};

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [evacuationRoute, setEvacuationRoute] = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, "incidents"), snap => {
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(inc => inc.status === "ACTIVE");
      setIncidents(active);
      
      // Recalculate routes when incidents update
      const blocked = getBlockedNodes(active);
      const route = dijkstra(buildingGraph, "4-EastWing", "AssemblyPoint", blocked);
      const routeCoords = route
        .filter(node => zoneCoordinates[node])
        .map(node => zoneCoordinates[node]);
      setEvacuationRoute(routeCoords);
    });
  }, []);

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Map
        defaultCenter={HOTEL_CENTER}
        defaultZoom={18}
        mapTypeId="satellite"
        style={{ width: "100%", height: "500px" }}
      >
        {/* Floor plan overlay */}
        <GroundOverlay
          url="/assets/floor_plan.png"
          bounds={FLOOR_PLAN_BOUNDS}
          opacity={0.7}
        />
        
        {/* Incident markers */}
        {incidents.map(inc => {
          const zoneKey = `${inc.location.floor}-${inc.location.zone?.replace(" ", "")}`;
          const pos = zoneCoordinates[zoneKey] || HOTEL_CENTER;
          return (
            <Marker
              key={inc.id}
              position={pos}
              title={`${inc.event_type} — Floor ${inc.location.floor}, Room ${inc.location.room}`}
              icon={{
                path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
                fillColor: EVENT_COLORS[inc.event_type] || "#333",
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "#fff",
                scale: 1
              }}
            />
          );
        })}
        
        {/* Evacuation route polyline */}
        {evacuationRoute.length > 1 && (
          <Polyline
            path={evacuationRoute}
            strokeColor="#00C853"
            strokeOpacity={1}
            strokeWeight={4}
          />
        )}
      </Map>
      
      <div style={{ padding: 8, background: "#F0F4FF", borderRadius: 8, marginTop: 8 }}>
        <strong>Evacuation Route:</strong>{" "}
        {evacuationRoute.length > 1
          ? evacuationRoute.join(" → ").replace(/zoneCoordinates/g, "")
          : "Calculating..."}
      </div>
    </APIProvider>
  );
}
```

**Phase 3 Done Criteria:** New fire event → red marker drops on map → green polyline reroutes away from fire zone → route shown as node path below map.

---

## 7. Phase 4 — Communications Layer (Weeks 7–8)
**Owner: Integration Lead (Member 4) + AI/ML Lead (Member 2)**  
**Goal: FCM alerts hit staff devices. Multilingual TTS announcement plays. Zone-clear flow works.**

### Step 4.1 — FCM Setup

**`public/firebase-messaging-sw.js`** (Service Worker for background notifications):
```javascript
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  // same config as firebase.js
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/sentinel-icon.png",
    badge: "/sentinel-badge.png",
    vibrate: [200, 100, 200, 100, 200] // Haptic pattern for accessibility
  });
});
```

**FCM Token Registration (add to `src/App.jsx` on login):**
```javascript
import { getToken } from "firebase/messaging";
import { messaging, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

async function registerFCMToken(userId) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    
    const token = await getToken(messaging, {
      vapidKey: "[YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE]"
    });
    
    await setDoc(doc(db, "staff", userId), { fcm_token: token }, { merge: true });
    console.log("FCM token registered");
  } catch (err) {
    console.error("FCM registration failed:", err);
  }
}
```

### Step 4.2 — FCM Dispatcher Cloud Function (`backend/cloud-functions/fcm-dispatcher/main.py`)
```python
import functions_framework
import json
from google.cloud import firestore
import firebase_admin
from firebase_admin import messaging as fcm_messaging

firebase_admin.initialize_app()
db = firestore.Client()

@functions_framework.cloud_event
def on_p0_incident(cloud_event):
    data = cloud_event.data
    new_value = data.get("value", {}).get("fields", {})
    
    severity = new_value.get("severity", {}).get("stringValue", "")
    if severity != "P0":
        return  # Only P0 triggers mass notification
    
    sitrep_data = db.collection("sessions").document("current").get().to_dict()
    safe_exits = sitrep_data.get("safe_exits", ["Staircase B"])
    blocked_exits = sitrep_data.get("blocked_exits", [])
    
    # Fetch all staff FCM tokens
    staff_docs = db.collection("staff").stream()
    tokens = [s.to_dict().get("fcm_token") for s in staff_docs if s.to_dict().get("fcm_token")]
    
    if not tokens:
        print("No staff tokens registered")
        return
    
    message = fcm_messaging.MulticastMessage(
        notification=fcm_messaging.Notification(
            title="🚨 SENTINEL EMERGENCY ALERT",
            body=f"P0 incident detected. Safe exits: {', '.join(safe_exits)}. Blocked: {', '.join(blocked_exits)}. Initiate evacuation NOW."
        ),
        data={
            "severity": "P0",
            "safe_exits": json.dumps(safe_exits),
            "blocked_exits": json.dumps(blocked_exits)
        },
        tokens=tokens
    )
    
    response = fcm_messaging.send_each_for_multicast(message)
    print(f"FCM sent: {response.success_count} success, {response.failure_count} failed")
```

**Trigger this function on Firestore session document update (Severity field changes to P0).**

### Step 4.3 — Text-to-Speech Multilingual Announcement

```python
# Add to event-processor or as separate Cloud Run endpoint
@app.route("/generate-announcement", methods=["POST"])
def generate_announcement():
    from google.cloud import texttospeech, storage
    
    body = request.get_json()
    language = body.get("language", "en")
    safe_exit = body.get("safe_exit", "Staircase B")
    floor = body.get("floor", 4)
    
    # Language-specific announcement templates
    announcements = {
        "en": f"Attention. Emergency alert. All guests on floor {floor}, please evacuate immediately using {safe_exit}. Do not use elevators.",
        "hi": f"ध्यान दें। आपातकालीन चेतावनी। मंजिल {floor} के सभी अतिथि कृपया तुरंत {safe_exit} का उपयोग करके निकासी करें।",
        "ja": f"注意。緊急警報。{floor}階のすべての宿泊客は、{safe_exit}を使用して直ちに避難してください。",
        "fr": f"Attention. Alerte urgence. Tous les clients au {floor}ième étage, veuillez évacuer immédiatement par {safe_exit}.",
        "es": f"Atención. Alerta de emergencia. Todos los huéspedes en el piso {floor}, por favor evacúen inmediatamente usando {safe_exit}."
    }
    
    language_codes = { "en": "en-US", "hi": "hi-IN", "ja": "ja-JP", "fr": "fr-FR", "es": "es-ES" }
    
    tts_client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=announcements.get(language, announcements["en"]))
    voice = texttospeech.VoiceSelectionParams(
        language_code=language_codes.get(language, "en-US"),
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    
    response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    
    # Store in Firebase Storage
    storage_client = storage.Client()
    bucket = storage_client.bucket("sentinel-crisis-2026.appspot.com")
    blob = bucket.blob(f"announcements/{language}_floor{floor}.mp3")
    blob.upload_from_string(response.audio_content, content_type="audio/mpeg")
    blob.make_public()
    
    return jsonify({ "audio_url": blob.public_url, "language": language })
```

**Frontend audio player + zone-clear (`src/components/ZoneClearButton.jsx`):**
```jsx
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function ZoneClearButton({ staffId, zone }) {
  const handleClear = async () => {
    await updateDoc(doc(db, "staff", staffId), {
      zone_cleared: true,
      zone_cleared_at: new Date().toISOString()
    });
    alert(`Zone ${zone} marked as clear.`);
  };
  
  const playAnnouncement = async (lang) => {
    const res = await fetch("/generate-announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, safe_exit: "Staircase B", floor: 4 })
    });
    const { audio_url } = await res.json();
    new Audio(audio_url).play();
  };

  return (
    <div>
      <button onClick={handleClear} style={{ background: "#00C853", color: "white", padding: "10px 20px", borderRadius: 6 }}>
        ✅ Mark Zone {zone} Clear
      </button>
      <div style={{ marginTop: 8 }}>
        <span>Play announcement: </span>
        {["en","hi","ja","fr","es"].map(lang => (
          <button key={lang} onClick={() => playAnnouncement(lang)} style={{ margin: "0 4px" }}>{lang.toUpperCase()}</button>
        ))}
      </div>
    </div>
  );
}
```

**Phase 4 Done Criteria:** Two devices open — one triggers P0 incident → FCM notification pops on second device within 1 second → audio plays in selected language → zone-clear button updates Firestore.

---

## 8. Phase 5 — Polish & Demo Prep (Weeks 9–10)
**Owner: All Members — Integration Lead coordinates**

### Step 5.1 — Offline Service Worker

**`public/sw.js`:**
```javascript
const CACHE_NAME = "sentinel-v1";
const ASSETS_TO_CACHE = [
  "/", "/index.html", "/assets/floor_plan.png",
  "/sentinel-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

Register in `src/main.jsx`:
```javascript
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => console.log("SW registered"));
}
```

### Step 5.2 — Demo Button (90-Second Scripted Scenario)

**`src/components/DemoButton.jsx`:**
```jsx
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const DEMO_SCRIPT = [
  { delay: 0,    event: { event_type: "FIRE",    location: { floor: 4, zone: "East Wing", room: "412" }, confidence: 0.95, source_type: "IOT_SENSOR" }},
  { delay: 5000, event: { event_type: "SMOKE",   location: { floor: 4, zone: "East Wing", room: "408" }, confidence: 0.88, source_type: "IOT_SENSOR" }},
  { delay: 15000,event: { event_type: "TRAPPED", location: { floor: 4, zone: "East Wing", room: "412" }, confidence: 0.80, source_type: "VOICE_DIALOGFLOW" }},
  { delay: 45000,event: { event_type: "MEDICAL", location: { floor: 3, zone: "West Wing", room: "301" }, confidence: 0.75, source_type: "VOICE_DIALOGFLOW" }}
];

export default function DemoButton() {
  const [running, setRunning] = useState(false);

  const runDemo = async () => {
    if (running) return;
    setRunning(true);
    
    for (const { delay, event } of DEMO_SCRIPT) {
      await new Promise(r => setTimeout(r, delay));
      await addDoc(collection(db, "incidents"), {
        ...event,
        event_id: crypto.randomUUID(),
        incident_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: "ACTIVE",
        ai_report: null,
        created_at: serverTimestamp()
      });
    }
    
    setRunning(false);
  };

  return (
    <button
      onClick={runDemo}
      disabled={running}
      style={{
        background: running ? "#555" : "#F44336",
        color: "white", fontWeight: 700, fontSize: 16,
        padding: "12px 28px", borderRadius: 8, border: "none", cursor: "pointer"
      }}
    >
      {running ? "🔴 DEMO RUNNING..." : "🎬 RUN 90-SECOND DEMO"}
    </button>
  );
}
```

### Step 5.3 — Pre-Recorded Video Mock (Vision Agent Simulation)

1. Record 30 seconds of someone waving near a camera
2. Submit to Video Intelligence API **once** using this script and save the JSON response:
```python
from google.cloud import videointelligence

client = videointelligence.VideoIntelligenceServiceClient()
with open("demo_clip.mp4", "rb") as f:
    input_content = f.read()

operation = client.annotate_video(
    request={
        "features": [
            videointelligence.Feature.LABEL_DETECTION,
            videointelligence.Feature.PERSON_DETECTION
        ],
        "input_content": input_content
    }
)
result = operation.result(timeout=120)

import json
with open("src/data/mock_video_analysis.json", "w") as f:
    json.dump(str(result), f)
```
3. During demo, feed `mock_video_analysis.json` directly into the Vision Agent pipeline as if live — zero API cost at demo time.

### Step 5.4 — Gemini Rate Limit Protection

All Gemini calls must go through this utility:
```javascript
// src/utils/rateLimiter.js
let lastCall = 0;
const DEBOUNCE_MS = 12000;
const queue = [];
let processing = false;

export async function rateLimitedGeminiCall(callFn) {
  return new Promise((resolve, reject) => {
    queue.push({ callFn, resolve, reject });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  while (queue.length) {
    const now = Date.now();
    const wait = Math.max(0, DEBOUNCE_MS - (now - lastCall));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const { callFn, resolve, reject } = queue.shift();
    try { resolve(await callFn()); } catch(e) { reject(e); }
    lastCall = Date.now();
  }
  processing = false;
}
```

### Step 5.5 — Firebase Hosting Deployment

**`firebase.json`:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/firebase-messaging-sw.js",
        "headers": [{ "key": "Service-Worker-Allowed", "value": "/" }]
      }
    ]
  }
}
```

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Step 5.6 — Stress Test Before Submission

Run these checks the day before submission:
1. Trigger 5 incidents within 30 seconds — verify Gemini debounce holds, no rate limit error
2. Disconnect Wi-Fi — verify PWA shows last cached state, Firestore offline persistence works
3. Open on mobile browser — verify PWA is responsive, FCM works on Android Chrome
4. Run full Demo Button scenario — time it, must complete visible changes within 90 seconds
5. Verify all 5 language TTS announcements play without error

---

## 9. CI/CD Pipeline (`.github/workflows/deploy.yml`)

```yaml
name: SENTINEL Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Deploy Cloud Run
        run: |
          gcloud run deploy sentinel-processor \
            --source backend/event-processor \
            --region asia-south1 \
            --allow-unauthenticated

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd frontend && npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA_KEY }}
          projectId: sentinel-crisis-2026
```

---

## 10. Environment Variables Reference

```bash
# GCP / Cloud Run
PROJECT_ID=sentinel-crisis-2026
REGION=asia-south1

# AI
GEMINI_API_KEY=[From AI Studio → Get API Key]

# Firebase (paste from Firebase console → Project Settings)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_VAPID_KEY=[From Firebase console → Cloud Messaging → Web Push certificates]

# Maps
VITE_MAPS_API_KEY=[From GCP console → APIs & Services → Credentials]

# Dialogflow
VITE_DIALOGFLOW_AGENT_ID=[From Dialogflow CX console → Agent → copy ID from URL]
```

Store all secrets in GitHub Secrets for CI/CD. Use `.env.local` locally (gitignored).

---

## 11. Free Tier Budget Tracker

| Service | Free Limit | Expected Usage | Risk |
|---|---|---|---|
| Cloud Run | 2M requests/month | ~500 demo calls | None |
| Firestore | 50K reads/day, 20K writes/day | ~2K writes/demo | None |
| Pub/Sub | 10GB/month | ~100MB | None |
| Gemini 2.0 Flash | 15 RPM, 1M TPM | 1 call/12s = 5 RPM | Low (debounced) |
| Speech-to-Text | 60 min/month | ~10 min demos | Low |
| Text-to-Speech | 1M chars/month | ~5K chars/demo | None |
| Video Intelligence | 1000 units/month | 0 (mock response) | None |
| Maps JS API | $200 credit/month | ~$2 | None |
| FCM | Unlimited | Unlimited | None |
| Firebase Hosting | 10GB/month | ~50MB | None |
| Cloud Functions | 2M invocations/month | ~200 | None |

---

## 12. Demo Script (Judges — 90 Seconds)

```
T+00s  Press "RUN 90-SECOND DEMO" button
T+03s  Fire sensor event appears in Incident Table — red row, Floor 4 East Wing
T+05s  Red marker drops on Google Map over East Wing zone
T+08s  Smoke event appears — orange marker
T+12s  Gemini SitRep panel populates: SEVERITY P0, safe exits, blocked exits
T+15s  Demo team speaks into browser: "Fire on Floor 3 East Wing, room 308"
T+18s  Dialogflow extracts floor 3, room 308 — new incident row in table, new map marker
T+30s  Evacuation route (green polyline) visibly reroutes away from fire zone
T+45s  TRAPPED incident triggers — mobility-impaired flag appears in SitRep
T+60s  FCM notification pops on second device (show to judges)
T+65s  Click "Play EN Announcement" — audio plays evacuation instruction
T+70s  Click "Play HI" and "Play JA" — two more language announcements
T+80s  Click "Mark Zone 4-EastWing Clear" — Firestore updates, dashboard reflects
T+90s  Point to: live map, SitRep JSON, FCM-notified device, TTS playing = full loop
```

---

## 13. Agent Handoff Notes (For Antigravity Continuation)

**What is complete after each phase:**
- Phase 1: `backend/event-processor` deployed on Cloud Run, `simulator.py` functional, React table live
- Phase 2: Gemini Cloud Function deployed, Dialogflow CX agent exported to `dialogflow/agent-export.zip`, SitRepPanel reading from Firestore sessions
- Phase 3: LiveMap.jsx with working Dijkstra routing, floor plan overlay pinned to coordinates
- Phase 4: FCM dispatcher Cloud Function deployed, TTS endpoint live, ZoneClearButton functional
- Phase 5: Service worker registered, DemoButton scripted, all stress tests passing

**Files an agent must never modify without schema review:**
- `src/data/guests.json`
- Any Firestore document schema (CrisisEvent fields)
- Gemini system prompt in `docs/gemini_prompt.txt`
- `src/utils/buildingGraph.js` node names (map markers depend on these keys)

**Known risks to resolve before submission:**
- Confirm `GroundOverlay` coordinates in `LiveMap.jsx` match actual exported floor plan PNG bounds
- Validate Dialogflow CX webhook URL is updated to deployed Cloud Run URL after each deploy
- Ensure `firebase-messaging-sw.js` is served from root domain — must be in `/public/`, not `/src/`
- Test FCM on Android Chrome specifically — iOS Safari has FCM limitations
- Gemini `response_mime_type: "application/json"` requires Gemini 2.0 Flash — confirm model string is `gemini-2.0-flash`

**Submission checklist:**
- [ ] All 5 phases passing demo script
- [ ] Firebase Hosting URL live and public
- [ ] 2-minute video demo recorded and uploaded
- [ ] GitHub repo public with README linking hosted app
- [ ] GCP project shared with Google Solution Challenge judges (add `solutions-judge@google.com` as Viewer)
- [ ] Submitted before April 28, 2026 23:59 IST
