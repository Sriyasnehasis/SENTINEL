/**
 * SENTINEL Demo Button Component
 * ================================
 * Runs a scripted 90-second demo scenario for judges.
 * Triggers a sequence of incidents to showcase full system capabilities:
 * - IoT sensor events (FIRE, SMOKE)
 * - Voice-reported incidents via Dialogflow simulation
 * - AI SitRep generation
 * - Dynamic evacuation route recalculation
 * - Mobility-impaired guest flagging
 * 
 * Usage: Click once to start the automated demo sequence.
 */

import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Play, Loader2 } from "lucide-react";

// ─── Demo Script Configuration ────────────────────────────────────────────────
// Each event is delayed by specified milliseconds from the start
const DEMO_SCRIPT = [
  {
    delay: 0,
    label: "🔥 FIRE detected in Room 412",
    event: {
      event_type: "FIRE",
      location: { floor: 4, zone: "East Wing", room: "412" },
      confidence: 0.95,
      source_type: "IOT_SENSOR",
      status: "ACTIVE"
    }
  },
  {
    delay: 5000, // +5 seconds
    label: "💨 SMOKE detected in Room 408",
    event: {
      event_type: "SMOKE",
      location: { floor: 4, zone: "East Wing", room: "408" },
      confidence: 0.88,
      source_type: "IOT_SENSOR",
      status: "ACTIVE"
    }
  },
  {
    delay: 15000, // +10 seconds
    label: "🆘 Guest TRAPPED in Room 412",
    event: {
      event_type: "TRAPPED",
      location: { floor: 4, zone: "East Wing", room: "412" },
      confidence: 0.80,
      source_type: "VOICE_DIALOGFLOW",
      status: "ACTIVE"
    }
  },
  {
    delay: 30000, // +15 seconds
    label: "🏥 MEDICAL emergency on Floor 3",
    event: {
      event_type: "MEDICAL",
      location: { floor: 3, zone: "West Wing", room: "301" },
      confidence: 0.75,
      source_type: "STAFF_APP",
      status: "ACTIVE"
    }
  },
  {
    delay: 45000, // +15 seconds
    label: "😱 PANIC reported in Floor 5 East Wing",
    event: {
      event_type: "PANIC",
      location: { floor: 5, zone: "East Wing", room: "512" },
      confidence: 0.70,
      source_type: "VOICE_DIALOGFLOW",
      status: "ACTIVE"
    }
  },
  {
    delay: 60000, // +15 seconds
    label: "🔥 Secondary FIRE on Floor 6",
    event: {
      event_type: "FIRE",
      location: { floor: 6, zone: "West Wing", room: "608" },
      confidence: 0.82,
      source_type: "IOT_SENSOR",
      status: "ACTIVE"
    }
  }
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Generate a UUID v4 for incident IDs
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create an incident document in Firestore
 */
async function createIncident(eventData) {
  const incident = {
    ...eventData,
    event_id: generateUUID(),
    incident_id: generateUUID(),
    timestamp: new Date().toISOString(),
    ai_report: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, "incidents"), incident);
    console.log(`✅ Incident created: ${incident.event_type} at ${incident.location.room}`);
    return docRef.id;
  } catch (error) {
    console.error("❌ Failed to create incident:", error);
    throw error;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DemoButton() {
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const runDemo = async () => {
    if (running) return;
    
    setRunning(true);
    setCurrentStep(-1);
    setProgress(0);
    setError(null);

    const startTime = Date.now();

    try {
      // Execute each step in the demo script
      for (let i = 0; i < DEMO_SCRIPT.length; i++) {
        const { delay, label, event } = DEMO_SCRIPT[i];
        
        // Wait until the scheduled time
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, delay - elapsed);
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        setCurrentStep(i);
        setProgress(((i + 1) / DEMO_SCRIPT.length) * 100);
        console.log(`🎬 Step ${i + 1}/${DEMO_SCRIPT.length}: ${label}`);

        // Create the incident
        await createIncident(event);
      }

      console.log("🎉 Demo sequence completed successfully!");
    } catch (err) {
      console.error("💥 Demo failed:", err);
      setError(err.message || "Failed to run demo");
    } finally {
      setRunning(false);
      setCurrentStep(-1);
    }
  };

  const currentLabel = currentStep >= 0 ? DEMO_SCRIPT[currentStep]?.label : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <button
        onClick={runDemo}
        disabled={running}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          background: running ? "#64748b" : "#F44336",
          color: "white",
          fontWeight: 700,
          fontSize: "1rem",
          padding: "0.875rem 1.5rem",
          borderRadius: "8px",
          border: "none",
          cursor: running ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: running ? "none" : "0 4px 12px rgba(244, 67, 54, 0.3)",
          opacity: running ? 0.7 : 1
        }}
        aria-busy={running}
        aria-label={running ? "Demo in progress" : "Run 90-second demo scenario"}
      >
        {running ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            DEMO RUNNING...
          </>
        ) : (
          <>
            <Play size={20} fill="white" />
            🎬 RUN 90-SECOND DEMO
          </>
        )}
      </button>

      {/* Progress indicator */}
      {running && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "3px",
              overflow: "hidden"
            }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #F44336, #FF9800)",
                transition: "width 0.3s ease"
              }}
            />
          </div>

          {/* Current step label */}
          {currentLabel && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                textAlign: "center",
                fontStyle: "italic"
              }}
            >
              {currentLabel}
            </div>
          )}

          {/* Step counter */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              textAlign: "center"
            }}
          >
            Step {currentStep + 1} of {DEMO_SCRIPT.length}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef4444",
            borderRadius: "6px",
            padding: "0.75rem",
            fontSize: "0.85rem",
            color: "#ef4444"
          }}
          role="alert"
        >
          ⚠️ Demo failed: {error}
        </div>
      )}

      {/* Instructions */}
      {!running && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#94a3b8",
            textAlign: "center",
            lineHeight: 1.5
          }}
        >
          This will trigger 6 incidents over 90 seconds.<br />
          Watch the map, SitRep panel, and incident table update in real-time.
        </div>
      )}
    </div>
  );
}
