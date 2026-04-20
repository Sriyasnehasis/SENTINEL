# SENTINEL — Production Deployment Guide

## Prerequisites

1. **Google Cloud Project**: `sentinel-5f9c1` (Firebase project already linked)
2. **Enabled APIs**:
   - Cloud Run Admin API
   - Cloud Functions Gen2 API
   - Firestore API
   - Pub/Sub API
   - Maps JavaScript API
   - Vertex AI API (for Gemini)
   - Text-to-Speech API (optional for production TTS)
   - Firebase Cloud Messaging API

3. **Installed Tools**:
   ```bash
   node --version  # v20+
   python3 --version  # 3.11+
   firebase --version  # Latest
   gcloud --version  # Latest
   ```

---

## Phase 1: Frontend Deployment (Firebase Hosting)

### Step 1.1: Build the Application

```bash
cd /workspace
npm install
npm run build
```

### Step 1.2: Configure Firebase Hosting

Ensure `firebase.json` exists with proper configuration:

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

### Step 1.3: Deploy to Firebase Hosting

```bash
firebase login
firebase deploy --only hosting
```

**Output**: Note the hosting URL (e.g., `https://sentinel-5f9c1.web.app`)

---

## Phase 2: Backend Deployment (Cloud Run)

### Step 2.1: Deploy Event Processor

```bash
cd /workspace/backend/event-processor

gcloud run deploy sentinel-processor \
  --source . \
  --region asia-south1 \
  --project sentinel-5f9c1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=sentinel-5f9c1
```

**Output**: Note the Cloud Run URL (e.g., `https://sentinel-processor-xxxxx.a.run.app`)

### Step 2.2: Test Event Processor

```bash
curl -X POST https://SENTIMENT_PROCESSOR_URL/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "FIRE",
    "location": {"floor": 4, "zone": "East Wing", "room": "412"},
    "confidence": 0.95
  }'
```

---

## Phase 3: Cloud Functions Deployment

### Step 3.1: Get Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create API key
3. Store securely (do not commit to Git)

### Step 3.2: Deploy Gemini Trigger Function

```bash
cd /workspace/backend/cloud-functions/gemini-trigger

gcloud functions deploy sentinel-gemini-trigger \
  --gen2 \
  --runtime python311 \
  --region asia-south1 \
  --source . \
  --entry-point on_incident_created \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters-path-pattern="document=incidents/{incidentId}" \
  --set-env-vars GEMINI_API_KEY=[YOUR_GEMINI_API_KEY] \
  --project sentinel-5f9c1
```

### Step 3.3: Deploy FCM Dispatcher Function

```bash
cd /workspace/backend/cloud-functions/fcm-dispatcher

gcloud functions deploy sentinel-fcm-dispatcher \
  --gen2 \
  --runtime python311 \
  --region asia-south1 \
  --source . \
  --entry-point on_p0_incident \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.written" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters-path-pattern="document=sessions/current" \
  --project sentinel-5f9c1
```

---

## Phase 4: Firestore Security Rules

Paste these rules into Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Incidents: read for authenticated users, write for system/staff
    match /incidents/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        (request.auth.token.role == 'system' || request.auth.token.role == 'staff');
      allow update, delete: if false; // Prevent manual modification
    }
    
    // Staff profiles: users can only read/write their own
    match /staff/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == id;
    }
    
    // Sessions: system-only writes, authenticated reads
    match /sessions/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'system';
    }
  }
}
```

---

## Phase 5: Environment Variables

### Frontend (.env.local)

Create `/workspace/.env.local`:

```bash
VITE_FIREBASE_API_KEY=AIzaSyAAk_se3CWtZ2lSiNOoWNXDZqBOfgRYnIY
VITE_FIREBASE_AUTH_DOMAIN=sentinel-5f9c1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sentinel-5f9c1
VITE_FIREBASE_STORAGE_BUCKET=sentinel-5f9c1.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=629107595024
VITE_FIREBASE_APP_ID=1:629107595024:web:a2e9f36f81a32710c53795
VITE_MAPS_API_KEY=[Your Maps API Key]
VITE_DIALOGFLOW_AGENT_ID=[Your Dialogflow CX Agent ID]
```

### Backend (Cloud Run & Functions)

Already set during deployment with `--set-env-vars` flags.

---

## Phase 6: Dialogflow CX Setup

### Step 6.1: Create Agent

1. Go to https://dialogflow.cloud.google.com/cx
2. Create new agent: `SENTINEL-Agent`
3. Region: `global`, Language: `English`

### Step 6.2: Create Intents

**Intent: FIRE_REPORT**
- Training phrases: "fire on floor 4", "I see smoke", "there's a fire in room 412"
- Parameters: `floor` (sys.number), `zone` (sys.any), `room` (sys.number)

**Intent: PERSON_TRAPPED**
- Training phrases: "someone is trapped", "I'm stuck", "people can't get out"

**Intent: MEDICAL**
- Training phrases: "someone is injured", "medical emergency", "unconscious person"

### Step 6.3: Configure Webhook

1. In Dialogflow CX → Webhooks → Create webhook
2. URL: `https://SENTINEL_PROCESSOR_URL/dialogflow-webhook`
3. Attach to each intent's fulfillment

### Step 6.4: Embed Messenger

Update `src/components/DialogflowWidget.jsx` with your Agent ID:

```jsx
<df-messenger
  intent="WELCOME"
  chat-title="SENTINEL Voice Report"
  agent-id="[YOUR_DIALOGFLOW_CX_AGENT_ID]"
  language-code="en"
/>
```

---

## Phase 7: Testing & Validation

### Pre-Deployment Checklist

- [ ] Firebase Hosting URL accessible
- [ ] Login/signup flow works
- [ ] Incident table shows real-time updates
- [ ] SitRep panel populates after incident creation
- [ ] Map displays with incident markers
- [ ] Evacuation route calculates correctly
- [ ] Demo button triggers sequence
- [ ] Zone clear button updates Firestore
- [ ] Multilingual announcements play

### Stress Tests

1. **Gemini Rate Limit**: Trigger 5 incidents within 30 seconds — verify debounce holds
2. **Offline Mode**: Disconnect Wi-Fi — verify PWA shows cached state
3. **Mobile Responsiveness**: Test on Android Chrome — verify FCM works
4. **Demo Timing**: Run full demo script — must complete within 90 seconds

---

## Phase 8: CI/CD Pipeline (Optional)

### GitHub Actions Setup

1. Create GitHub Secrets:
   - `GCP_SA_KEY`: Service account JSON for Cloud Run deployment
   - `FIREBASE_SA_KEY`: Service account JSON for Firebase deployment

2. Push `.github/workflows/deploy.yml` (already in repo)

3. Commits to `main` branch will auto-deploy

---

## Troubleshooting

### Common Issues

**Map not loading:**
- Verify `VITE_MAPS_API_KEY` is set
- Check Maps JavaScript API is enabled in GCP
- Ensure API key has no domain restrictions blocking localhost

**SitRep not generating:**
- Check Cloud Function logs: `gcloud functions logs read sentinel-gemini-trigger`
- Verify Gemini API key is valid
- Confirm Firestore trigger is firing

**FCM not working:**
- Ensure `firebase-messaging-sw.js` is served from root domain
- Check VAPID key is correctly configured
- Test on Android Chrome (iOS Safari has FCM limitations)

**Build fails:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: must be v20+
- Verify all imports are correct

---

## Cost Monitoring

All services are within Google Cloud Free Tier:

| Service | Free Limit | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Cloud Run | 2M requests | ~500 demo calls | $0 |
| Firestore | 50K reads/day | ~2K writes/demo | $0 |
| Cloud Functions | 2M invocations | ~200 | $0 |
| Gemini 2.0 Flash | 15 RPM | 1 call/12s | $0 |
| Maps JS API | $200 credit | ~$2 | $0 |
| Firebase Hosting | 10GB/month | ~50MB | $0 |

Monitor usage at: https://console.cloud.google.com/billing

---

## Submission Checklist

- [ ] All 5 phases passing demo script
- [ ] Firebase Hosting URL live and public
- [ ] 2-minute video demo recorded
- [ ] GitHub repo public with README
- [ ] GCP project shared with judges (`solutions-judge@google.com`)
- [ ] Submitted before April 28, 2026 23:59 IST

---

**Last Updated**: $(date +%Y-%m-%d)  
**Version**: 1.0.0  
**Maintained By**: SENTINEL Team
