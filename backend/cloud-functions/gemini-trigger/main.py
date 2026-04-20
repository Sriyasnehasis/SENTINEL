"""
SENTINEL Gemini Trigger — Cloud Function (2nd Gen)
===================================================
Triggered on Firestore write to /incidents/{incidentId}
Calls Gemini 2.0 Flash API to generate AI Situation Report (SitRep)
Writes SitRep to /sessions/current document

Deploy:
  gcloud functions deploy sentinel-gemini-trigger \\
    --gen2 \\
    --runtime python311 \\
    --region asia-south1 \\
    --source backend/cloud-functions/gemini-trigger \\
    --entry-point on_incident_created \\
    --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \\
    --trigger-event-filters="database=(default)" \\
    --trigger-event-filters-path-pattern="document=incidents/{incidentId}" \\
    --set-env-vars GEMINI_API_KEY=[YOUR_KEY]
"""

import functions_framework
import json
import os
import time
from google.cloud import firestore
import google.generativeai as genai

# Initialize clients
db = firestore.Client()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Rate limit state (in-memory debounce)
# Gemini 2.0 Flash free tier: 15 RPM = 1 call per 4 seconds
# Using 12 second debounce for safety margin
last_gemini_call = 0
DEBOUNCE_SECONDS = 12

# Load system prompt
try:
    with open("system_prompt.txt", "r") as f:
        SYSTEM_PROMPT = f.read()
except FileNotFoundError:
    SYSTEM_PROMPT = """You are SENTINEL's Root AI Agent for emergency crisis response.
You receive a JSON array of active incidents from a hotel emergency system.
You must respond ONLY with a valid JSON object matching this exact schema:
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
P0 = immediate threat to life. P1 = high risk. P2 = monitor only."""


@functions_framework.cloud_event
def on_incident_created(cloud_event):
    """
    Cloud Function trigger fired when new incident is created in Firestore.
    Generates AI SitRep and writes to /sessions/current
    """
    global last_gemini_call
    
    # Debounce rate limiting
    now = time.time()
    if now - last_gemini_call < DEBOUNCE_SECONDS:
        print(f"⏱️ Debounced — skipping Gemini call ({now - last_gemini_call:.1f}s since last)")
        return
    last_gemini_call = now
    
    try:
        # Fetch all ACTIVE incidents from Firestore
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
            print("ℹ️ No active incidents found")
            return
        
        print(f"📊 Analyzing {len(incidents)} active incidents")
        
        # Load guests for mobility-impaired context
        try:
            with open("guests.json", "r") as f:
                guests = json.load(f)
        except FileNotFoundError:
            guests = []
            print("⚠️ guests.json not found — running without mobility context")
        
        mobility_context = [
            f"Room {g['room']} Floor {g['floor']}"
            for g in guests if g.get("mobility_impaired")
        ]
        
        # Build user message for Gemini
        user_message = f"""
Active incidents: {json.dumps(incidents)}
Mobility-impaired guest rooms: {mobility_context}
Known exits: Staircase A (West), Staircase B (East), Staircase C (North), Staircase D (South)
"""
        
        # Call Gemini API
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        response = model.generate_content(user_message)
        sitrep = json.loads(response.text)
        
        print(f"✅ SitRep generated: {sitrep.get('severity')} — {sitrep.get('threat_summary', '')[:50]}...")
        
        # Write SitRep to shared session document
        db.collection("sessions").document("current").set({
            "current_sitrep": sitrep,
            "active_incidents": [inc["event_type"] for inc in incidents],
            "last_updated": firestore.SERVER_TIMESTAMP,
            "blocked_exits": sitrep.get("blocked_exits", []),
            "safe_exits": sitrep.get("safe_exits", [])
        }, merge=True)
        
        # Check if P0 severity — trigger FCM dispatcher
        if sitrep.get("severity") == "P0":
            print("🚨 P0 SEVERITY DETECTED — triggering FCM alerts")
            # Optionally trigger FCM dispatcher here via HTTP call or Pub/Sub
        
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        # Fallback: write error indicator to session
        db.collection("sessions").document("current").set({
            "sitrep_error": str(e),
            "last_updated": firestore.SERVER_TIMESTAMP
        }, merge=True)
