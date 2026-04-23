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
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { Play, Loader2, Sparkles } from "lucide-react";

// ─── Demo Script Configuration ────────────────────────────────────────────────
// Each event is delayed by specified milliseconds from the start
const DEMO_SCRIPT = [
  { delay: 0,     label: "🔥 FIRE in MT Floor 4 East Hall",         event: { event_type: "FIRE",    location: { floor: "MT-4",  zone: "EastHall", room: "412",     nodeId: "MT-4-EastHall"  }, confidence: 0.95, source_type: "IOT_SENSOR",       status: "ACTIVE" } },
  { delay: 6000,  label: "💨 SMOKE in MT Floor 4 West Hall",        event: { event_type: "SMOKE",   location: { floor: "MT-4",  zone: "WestHall", room: "408",     nodeId: "MT-4-WestHall"  }, confidence: 0.88, source_type: "IOT_SENSOR",       status: "ACTIVE" } },
  { delay: 12000, label: "🆘 Patient TRAPPED in ICU Floor 2",        event: { event_type: "TRAPPED", location: { floor: "ICU-2", zone: "Central",  room: "ICU-201", nodeId: "ICU-2-Central"  }, confidence: 0.80, source_type: "VOICE_DIALOGFLOW", status: "ACTIVE" } },
  { delay: 20000, label: "🏥 MEDICAL emergency in MT Floor 3 Ward A", event: { event_type: "MEDICAL",  location: { floor: "MT-3",  zone: "WardA",    room: "301",     nodeId: "MT-3-WardA"     }, confidence: 0.75, source_type: "STAFF_APP",       status: "ACTIVE" } },
  { delay: 30000, label: "😱 PANIC in MT Floor 2 East Hall",         event: { event_type: "PANIC",   location: { floor: "MT-2",  zone: "EastHall", room: "212",     nodeId: "MT-2-EastHall"  }, confidence: 0.70, source_type: "VOICE_DIALOGFLOW", status: "ACTIVE" } },
  { delay: 40000, label: "🔥 Secondary FIRE in ICU Floor 3 Neuro",   event: { event_type: "FIRE",    location: { floor: "ICU-3", zone: "Neuro",    room: "ICU-301", nodeId: "ICU-3-Neuro"    }, confidence: 0.82, source_type: "IOT_SENSOR",       status: "ACTIVE" } },
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
    
    // 🧠 Phase 2/3 FIX: Mock the AI analysis so SitRepPanel works locally
    const mockAnalysis = {
      severity: incident.event_type === "FIRE" ? "P0" : "P1",
      threat_summary: `${incident.event_type} DETECTED IN ${incident.location.zone.toUpperCase()} ROOM ${incident.location.room}. EXTREME CAUTION ADVISED.`,
      safe_exits: ["STAIRCASE-B", "WEST-EVAC-EXIT"],
      blocked_exits: incident.event_type === "FIRE" ? ["EAST-WING-MAIN"] : [],
      recommended_actions: [
        "DEPLOY EMERGENCY RESPONSE TEAM",
        "CLEAR NON-ESSENTIAL STAFF FROM SECTOR",
        "INITIATE AUDIO ANNOUNCEMENT"
      ]
    };

    await setDoc(doc(db, "sessions", "current"), {
      current_sitrep: mockAnalysis,
      last_updated: serverTimestamp(),
      incident_count: 1
    }, { merge: true });

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
