import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

/**
 * SENTINEL Hybrid AI SitRep Panel
 * Primary: Llama-3.1 via Groq with JSON mode
 * Fallback: Local Edge AI (offline-safe, no rate limits)
 * Debounced: Only calls Groq once per 30 seconds to stay under free-tier TPM
 */

function generateLocalSitRep(incidents) {
  const floors = [...new Set(incidents.map(i => i.location?.floor))];
  const fireZones = incidents
    .filter(i => i.event_type === "FIRE" || i.event_type === "SMOKE")
    .map(i => i.location?.zone || "Unknown");

  return {
    severity: incidents.length >= 3 ? "P0" : "P1",
    threat_summary: `Hospital Alert on floors ${floors.join(", ")}. ${incidents.length} active threats. Primary: ${incidents[0].event_type} in ${incidents[0].location?.zone}. Evacuate all patients via fire-rated stairwells immediately.`,
    safe_exits: ["Stair-A (East Fire-Rated)", "Stair-C (East)", "FE-East"],
    blocked_exits: fireZones.length > 0 ? fireZones : ["None"],
    recommended_actions: [
      "Activate hospital emergency protocol.",
      "Use fire-rated stairwells A and C only.",
      "Lock all elevators per NFPA 101.",
      "ICU staff: initiate patient evacuation protocol."
    ]
  };
}

export default function SitRepPanel() {
  const [sitrep, setSitrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("");
  const lock = useRef(false);
  const lastCallTime = useRef(0);

  const fetchAI = async (active) => {
    if (lock.current || active.length === 0) return;

    // Debounce: only call Groq API once every 30 seconds to avoid 429
    const now = Date.now();
    const timeSinceLast = now - lastCallTime.current;
    if (timeSinceLast < 30000 && sitrep) return; // already have a report, skip

    lock.current = true;
    setLoading(true);

    try {
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) throw new Error("No Groq key");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" }, // Forces JSON output, no markdown
          messages: [
            {
              role: "system",
              content: `You are SENTINEL hospital AI. Return ONLY this JSON:
{"severity":"P0","threat_summary":"brief summary","safe_exits":["Stair-A","FE-East"],"blocked_exits":["zone"],"recommended_actions":["action1"]}`
            },
            {
              role: "user",
              content: JSON.stringify(active.slice(0, 3)) // Only send first 3 to save tokens
            }
          ]
        })
      });

      const data = await response.json();
      if (!data.choices) throw new Error(data.error?.message || "Groq error");

      setSitrep(JSON.parse(data.choices[0].message.content));
      setEngine("Llama-3.1 via Groq");
      lastCallTime.current = Date.now();
    } catch (e) {
      console.warn("Groq fallback:", e.message);
      setSitrep(generateLocalSitRep(active));
      setEngine("SENTINEL Edge AI");
      lastCallTime.current = Date.now();
    } finally {
      setLoading(false);
      lock.current = false;
    }
  };

  // Trigger FCM when severity hits P0
  useEffect(() => {
    if (sitrep?.severity === "P0") {
      const url = (import.meta.env.VITE_EVENT_PROCESSOR_URL || "https://sentinel-5ytz.onrender.com") + "/dispatch-fcm";
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: sitrep.severity,
          safe_exits: sitrep.safe_exits,
          blocked_exits: sitrep.blocked_exits
        })
      }).catch(console.error);
    }
  }, [sitrep]);

  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "==", "ACTIVE"));
    return onSnapshot(q, (snap) => {
      const active = snap.docs.map(d => d.data());
      if (active.length > 0) {
        fetchAI(active);
      } else {
        setSitrep(null);
        setEngine("");
        lock.current = false;
        lastCallTime.current = 0;
      }
    });
  }, []);

  if (loading && !sitrep) return (
    <div style={{ padding: "1.5rem", textAlign: "center", color: "#6366f1" }}>
      <span style={{ fontWeight: 800 }}>🤖 Analyzing hospital incident stream...</span>
    </div>
  );

  if (!sitrep) return (
    <div style={{ padding: "1.2rem", opacity: 0.5, textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "10px" }}>
      System Nominal. All hospital zones monitored.
    </div>
  );

  const color = sitrep.severity === "P0" ? "#ef4444" : "#f59e0b";

  return (
    <div className="animate-in" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ color, margin: 0, fontSize: "1rem", fontWeight: 800 }}>🚨 {sitrep.severity} SITUATION REPORT</h3>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px", color: "#94a3b8" }}>{engine}</span>
          <button
            onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${sitrep.severity}. ${sitrep.threat_summary}`))}
            style={{ background: "#6366f1", color: "white", padding: "3px 8px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700 }}
          >📢 SPEAK</button>
        </div>
      </div>
      <p style={{ margin: "0.5rem 0 0.75rem", fontSize: "0.82rem", lineHeight: 1.6, opacity: 0.9 }}>{sitrep.threat_summary}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.72rem" }}>
        <div style={{ color: "#22c55e", fontWeight: 700 }}>✅ SAFE: {sitrep.safe_exits?.join(", ")}</div>
        <div style={{ color: "#ef4444", fontWeight: 700 }}>🚫 BLOCKED: {sitrep.blocked_exits?.join(", ") || "None"}</div>
      </div>
    </div>
  );
}
