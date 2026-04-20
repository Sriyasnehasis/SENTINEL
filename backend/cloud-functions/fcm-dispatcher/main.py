"""
SENTINEL FCM Dispatcher — Cloud Function (2nd Gen)
===================================================
Triggered on Firestore write to /sessions/current when severity becomes P0
Sends Firebase Cloud Messaging notifications to all registered staff devices

Deploy:
  gcloud functions deploy sentinel-fcm-dispatcher \\
    --gen2 \\
    --runtime python311 \\
    --region asia-south1 \\
    --source backend/cloud-functions/fcm-dispatcher \\
    --entry-point on_p0_incident \\
    --trigger-event-filters="type=google.cloud.firestore.document.v1.written" \\
    --trigger-event-filters="database=(default)" \\
    --trigger-event-filters-path-pattern="document=sessions/current"
"""

import functions_framework
import json
from google.cloud import firestore
import firebase_admin
from firebase_admin import messaging as fcm_messaging
from firebase_admin import credentials

# Initialize Firebase Admin SDK
try:
    firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass

db = firestore.Client()


@functions_framework.cloud_event
def on_p0_incident(cloud_event):
    """
    Cloud Function trigger fired when /sessions/current is updated.
    Checks if severity is P0 and sends FCM alerts to all staff.
    """
    try:
        data = cloud_event.data
        new_value = data.get("value", {}).get("fields", {})
        
        # Extract severity from the SitRep
        current_sitrep_field = new_value.get("current_sitrep", {}).get("mapValue", {}).get("fields", {})
        severity = current_sitrep_field.get("severity", {}).get("stringValue", "")
        
        if severity != "P0":
            print(f"ℹ️ Severity is {severity}, not P0 — skipping FCM dispatch")
            return
        
        print("🚨 P0 SEVERITY DETECTED — sending FCM alerts")
        
        # Fetch current SitRep data
        session_doc = db.collection("sessions").document("current").get()
        if not session_doc.exists:
            print("⚠️ Session document not found")
            return
        
        session_data = session_doc.to_dict()
        sitrep = session_data.get("current_sitrep", {})
        safe_exits = sitrep.get("safe_exits", ["Staircase B"])
        blocked_exits = sitrep.get("blocked_exits", [])
        
        # Fetch all staff FCM tokens
        staff_docs = db.collection("staff").stream()
        tokens = []
        for doc in staff_docs:
            staff_data = doc.to_dict()
            token = staff_data.get("fcm_token")
            if token:
                tokens.append(token)
        
        if not tokens:
            print("⚠️ No staff tokens registered")
            return
        
        print(f"📱 Sending FCM to {len(tokens)} staff devices")
        
        # Build FCM message
        message = fcm_messaging.MulticastMessage(
            notification=fcm_messaging.Notification(
                title="🚨 SENTINEL EMERGENCY ALERT",
                body=f"P0 incident detected. Safe exits: {', '.join(safe_exits)}. Blocked: {', '.join(blocked_exits)}. Initiate evacuation NOW."
            ),
            data={
                "severity": "P0",
                "safe_exits": json.dumps(safe_exits),
                "blocked_exits": json.dumps(blocked_exits),
                "click_action": "FLUTTER_NOTIFICATION_CLICK"
            },
            tokens=tokens,
            android=fcm_messaging.AndroidConfig(
                priority="high",
                notification=fcm_messaging.AndroidNotification(
                    sound="default",
                    color="#F44336"
                )
            ),
            apns=fcm_messaging.APNSConfig(
                payload=fcm_messaging.APNSPayload(
                    aps=fcm_messaging.Aps(
                        sound="default"
                    )
                )
            )
        )
        
        # Send multicast message
        response = fcm_messaging.send_each_for_multicast(message)
        
        print(f"✅ FCM sent: {response.success_count} success, {response.failure_count} failed")
        
        # Log failures for debugging
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    print(f"  Failed token {idx}: {resp.exception}")
    
    except Exception as e:
        print(f"❌ FCM dispatcher error: {e}")
