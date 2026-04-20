"""
SENTINEL IoT Simulator
======================
Pushes fake emergency events to Google Cloud Pub/Sub every 5 seconds.
These are then received by the Event Processor (Cloud Run) which writes
them to Firestore → triggers the React dashboard to update in real time.

Run locally:
  pip install google-cloud-pubsub
  python simulator.py

NOTE: Requires gcloud auth + PROJECT_ID to be set correctly below.
"""

import json
import uuid
import time
import random
from datetime import datetime, timezone

try:
    from google.cloud import pubsub_v1
    USE_PUBSUB = True
except ImportError:
    USE_PUBSUB = False
    print("⚠️  google-cloud-pubsub not installed. Running in PRINT-ONLY mode.")
    print("   Install with: pip install google-cloud-pubsub\n")

# ─── CONFIG ───────────────────────────────────────────────────────────────────
PROJECT_ID = "sentinel-5f9c1"
TOPIC_ID   = "sentinel-events-raw"
INTERVAL_SECONDS = 5  # how often to emit an event

# ─── DATA POOLS ───────────────────────────────────────────────────────────────
EVENT_TYPES = ["FIRE", "SMOKE", "TRAPPED", "MEDICAL", "PANIC"]
ZONES       = ["East Wing", "West Wing", "North Corridor", "South Corridor"]
FLOORS      = [3, 4, 5, 6]
ROOMS       = ["301", "312", "401", "412", "501", "511", "601", "308", "410"]

# weights: FIRE and SMOKE more likely — realistic for demo
WEIGHTS = [0.30, 0.30, 0.20, 0.15, 0.05]


def generate_event() -> dict:
    """Generate a single CrisisEvent matching the canonical schema."""
    return {
        "event_id":    str(uuid.uuid4()),
        "incident_id": str(uuid.uuid4()),
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "source_type": "IOT_SENSOR",
        "event_type":  random.choices(EVENT_TYPES, weights=WEIGHTS)[0],
        "location": {
            "floor": random.choice(FLOORS),
            "zone":  random.choice(ZONES),
            "room":  random.choice(ROOMS),
        },
        "confidence": round(random.uniform(0.70, 0.99), 2),
        "status":     "ACTIVE",
        "ai_report":  None,
    }


def run():
    if USE_PUBSUB:
        publisher  = pubsub_v1.PublisherClient()
        topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)
        print(f"✅ Connected to Pub/Sub topic: {topic_path}")
    else:
        publisher  = None
        topic_path = None

    print("🚀 SENTINEL IoT Simulator started — emitting events every "
          f"{INTERVAL_SECONDS}s. Press Ctrl+C to stop.\n")

    count = 0
    while True:
        count += 1
        event = generate_event()
        payload = json.dumps(event)

        if USE_PUBSUB and publisher:
            future = publisher.publish(topic_path, payload.encode("utf-8"))
            msg_id = future.result()
            print(f"[{count:04d}] Published → {event['event_type']:>8} | "
                  f"Floor {event['location']['floor']} | "
                  f"{event['location']['zone']:<18} | "
                  f"Room {event['location']['room']} | "
                  f"Conf: {int(event['confidence']*100)}% | msg_id={msg_id}")
        else:
            print(f"[{count:04d}] SIMULATED → {event['event_type']:>8} | "
                  f"Floor {event['location']['floor']} | "
                  f"{event['location']['zone']:<18} | "
                  f"Room {event['location']['room']} | "
                  f"Conf: {int(event['confidence']*100)}%")
            print(f"         Payload: {payload}\n")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")
