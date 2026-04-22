"""
SENTINEL Event Processor — Cloud Run Service
=============================================
Receives Pub/Sub push messages, validates the CrisisEvent schema,
writes to Firestore /incidents/{incident_id}.

Deploy:
  gcloud run deploy sentinel-processor \\
    --source . \\
    --region asia-south1 \\
    --allow-unauthenticated \\
    --set-env-vars PROJECT_ID=sentinel-5f9c1
"""

import json
import os
import uuid
import base64
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from google.cloud import firestore

app = Flask(__name__)
db  = firestore.Client()

REQUIRED_FIELDS = ["event_id", "incident_id", "event_type", "location", "confidence"]
VALID_EVENT_TYPES = {"FIRE", "SMOKE", "TRAPPED", "INJURY", "MEDICAL", "PANIC"}


# ─── Pub/Sub Push Ingest ─────────────────────────────────────────────────────
@app.route("/ingest", methods=["POST"])
def ingest():
    """Receive a Pub/Sub push message and write the event to Firestore."""
    envelope = request.get_json(silent=True)
    if not envelope or "message" not in envelope:
        return jsonify({"error": "bad request — missing Pub/Sub envelope"}), 400

    try:
        message_data = base64.b64decode(envelope["message"]["data"]).decode("utf-8")
        event = json.loads(message_data)
    except Exception as e:
        return jsonify({"error": f"decode error: {e}"}), 400

    # Validate required fields
    missing = [f for f in REQUIRED_FIELDS if f not in event]
    if missing:
        return jsonify({"error": f"invalid schema — missing: {missing}"}), 400

    # Validate event_type whitelist
    if event.get("event_type") not in VALID_EVENT_TYPES:
        return jsonify({"error": f"unknown event_type: {event['event_type']}"}), 400

    # Ensure timestamp is set
    if not event.get("timestamp"):
        event["timestamp"] = datetime.now(timezone.utc).isoformat()

    # Write to Firestore
    db.collection("incidents").document(event["incident_id"]).set(event)
    print(f"✅ Stored incident: {event['incident_id']} | {event['event_type']} | Floor {event['location'].get('floor')}")
    return jsonify({"status": "ok", "incident_id": event["incident_id"]}), 200


# ─── Phase 4.3: Text-to-Speech Announcement ──────────────────────────────────
@app.route("/generate-announcement", methods=["POST"])
def generate_announcement():
    from google.cloud import texttospeech, storage
    
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "No body provided"}), 400
        
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
    
    try:
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
        # Ensure we use the correct bucket name, matching the expected format
        bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "sentinel-5f9c1.firebasestorage.app")
        # remove 'gs://' if present
        bucket_name = bucket_name.replace("gs://", "")
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"announcements/{language}_floor{floor}.mp3")
        blob.upload_from_string(response.audio_content, content_type="audio/mpeg")
        blob.make_public()
        
        return jsonify({ "audio_url": blob.public_url, "language": language })
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        return jsonify({"error": str(e)}), 500


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "sentinel-processor"}), 200


# ─── Direct Write (for testing without Pub/Sub) ───────────────────────────────
@app.route("/incidents", methods=["POST"])
def create_incident():
    """Direct incident creation endpoint for testing (no Pub/Sub required)."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "no body"}), 400

    # Auto-fill defaults
    body.setdefault("event_id",    str(uuid.uuid4()))
    body.setdefault("incident_id", str(uuid.uuid4()))
    body.setdefault("timestamp",   datetime.now(timezone.utc).isoformat())
    body.setdefault("source_type", "STAFF_APP")
    body.setdefault("status",      "ACTIVE")
    body.setdefault("ai_report",   None)

    missing = [f for f in REQUIRED_FIELDS if f not in body]
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400

    db.collection("incidents").document(body["incident_id"]).set(body)
    return jsonify({"status": "created", "incident_id": body["incident_id"]}), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
