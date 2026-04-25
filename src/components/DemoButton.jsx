import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { Terminal, Loader2 } from "lucide-react";

const DEMO_SCRIPT = [
  { delay: 0,     label: "💨 SMOKE in MT Stairwell A - Floor 1",    event: { event_type: "SMOKE",   location: { floor: "MT-1",  zone: "Stairwell A", nodeId: "Stair-A-1" }, confidence: 0.95, source_type: "IOT_SENSOR", status: "ACTIVE" } },
  { delay: 8000,  label: "🔥 FIRE in MT Floor 3 East Hall",         event: { event_type: "FIRE",    location: { floor: "MT-3",  zone: "East Hall",   nodeId: "MT-3-EastHall" }, confidence: 0.98, source_type: "IOT_SENSOR", status: "ACTIVE" } },
  { delay: 16000, label: "🔥 FIRE in MT Stairwell B - Floor 3",    event: { event_type: "FIRE",    location: { floor: "MT-3",  zone: "Stairwell B", nodeId: "Stair-B-3" }, confidence: 0.92, source_type: "IOT_SENSOR", status: "ACTIVE" } },
  { delay: 24000, label: "🔥 FIRE in ICU-MT Skybridge Floor 3",     event: { event_type: "FIRE",    location: { floor: "Shared", zone: "Skybridge",  nodeId: "Bridge-MT-ICU-3" }, confidence: 0.95, source_type: "IOT_SENSOR", status: "ACTIVE" } },
];

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    const mockAnalysis = {
      severity: incident.event_type === "FIRE" ? "P0" : "P1",
      threat_summary: `${incident.event_type} DETECTED IN ${incident.location.zone.toUpperCase()} ROOM ${incident.location.room}. EXTREME CAUTION ADVISED.`,
      safe_exits: ["STAIRCASE-B", "WEST-EVAC-EXIT"],
      blocked_exits: incident.event_type === "FIRE" ? ["EAST-WING-MAIN"] : [],
      recommended_actions: ["DEPLOY EMERGENCY RESPONSE TEAM", "CLEAR NON-ESSENTIAL STAFF FROM SECTOR", "INITIATE AUDIO ANNOUNCEMENT"]
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

export default function DemoButton() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runDemo = async () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    const startTime = Date.now();
    try {
      // Step 0: Initialize Demo Session with Occupants in Firestore
      const occupants = [
        { id: 'P1', startNode: 'MT-4-WestHall',    label: 'Occupant P1 (Staff)',   color: '#00E5FF' },
        { id: 'P2', startNode: 'ER-1-SurgicalHub', label: 'Occupant P2 (Visitor)', color: '#FF0055' },
        { id: 'P3', startNode: 'ICU-3-Central',    label: 'Occupant P3 (Patient)', color: '#FFEB3B' }
      ];

      await setDoc(doc(db, "sessions", "current"), {
        occupants: occupants,
        status: "DEMO_ACTIVE",
        last_updated: serverTimestamp(),
        incident_count: 0
      });

      // Step 1: Execute Incident Script
      for (let i = 0; i < DEMO_SCRIPT.length; i++) {
        const { delay, event } = DEMO_SCRIPT[i];
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, delay - elapsed);
        if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
        setProgress(((i + 1) / DEMO_SCRIPT.length) * 100);
        await createIncident(event);
      }
    } catch (err) {
      console.error("💥 Demo failed:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <button
        onClick={runDemo}
        disabled={running}
        className="hacker-btn-cyan"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          height: "100%",
          background: "transparent",
          color: "var(--primary)",
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.65rem",
          padding: "0 1rem",
          borderRadius: "0",
          border: "1px solid var(--primary)",
          cursor: running ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          textTransform: "uppercase",
          letterSpacing: "0.1em"
        }}
      >
        {running ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            INIT_SEQ_{Math.floor(progress)}%
          </>
        ) : (
          <>
            <Terminal size={14} />
            CREATE_DEMO
          </>
        )}
      </button>

      {running && (
        <div style={{ position: "absolute", bottom: 0, left: 0, width: `${progress}%`, height: "2px", background: "var(--primary)", boxShadow: "0 0 10px var(--primary)", transition: "width 0.3s linear" }} />
      )}

      <style>{`
        .hacker-btn-cyan:hover:not(:disabled) {
          background: var(--primary) !important;
          color: var(--bg-void) !important;
          box-shadow: 0 0 15px var(--primary-glow);
        }
        .hacker-btn-cyan:active:not(:disabled) {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}
