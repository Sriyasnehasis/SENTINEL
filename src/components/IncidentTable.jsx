import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { Flame, Wind, UserX, Activity, Clock, MapPin, AlertTriangle } from "lucide-react";

const EVENT_META = {
  FIRE:    { color: "var(--accent)", bg: "rgba(255,0,85,0.15)",   label: "FIRE",    icon: Flame },
  SMOKE:   { color: "var(--neon-orange)", bg: "rgba(255,159,0,0.15)",  label: "SMOKE",   icon: Wind },
  TRAPPED: { color: "var(--primary)", bg: "rgba(0,245,255,0.15)",  label: "TRAPPED", icon: UserX },
  MEDICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.15)",  label: "MEDICAL", icon: Activity },
  INJURY:  { color: "var(--neon-orange)", bg: "rgba(245,158,11,0.15)",  label: "INJURY",  icon: AlertTriangle },
  PANIC:   { color: "#ec4899", bg: "rgba(236,72,153,0.15)",  label: "PANIC",   icon: AlertTriangle },
};

const STATUS_META = {
  ACTIVE:       { color: "var(--accent)", label: "CRITICAL" },
  INVESTIGATING:{ color: "var(--neon-orange)", label: "DISPATCHED" },
  RESOLVED:     { color: "var(--neon-green)", label: "SECURE" },
};

export default function IncidentTable() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
        SYNCING_STREAM...
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.6rem" }}>
        <thead>
          <tr>
            {["Code", "Level", "Sector", "ID", "Conf.", "Source", "Status", "Timestamp"].map((h) => (
              <th key={h} style={{
                padding: "0.75rem 0.5rem",
                textAlign: "left",
                color: "var(--text-muted)",
                fontFamily: "JetBrains Mono",
                fontSize: "0.55rem",
                borderBottom: "1px solid var(--border-dim)"
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc, idx) => {
            const meta = EVENT_META[inc.event_type] || {
              color: "var(--text-muted)", bg: "rgba(148,163,184,0.1)", label: inc.event_type
            };
            const statusMeta = STATUS_META[inc.status] || { color: "var(--text-muted)", label: inc.status };
            return (
              <tr
                key={inc.id}
                onClick={() => {
                  if (inc.location?.nodeId) {
                    window.dispatchEvent(new CustomEvent('sentinel-focus-node', { detail: inc.location.nodeId }));
                  }
                }}
                style={{
                  borderBottom: "1px solid var(--border-dim)",
                  animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
                  cursor: inc.location?.nodeId ? "pointer" : "default",
                  fontFamily: "JetBrains Mono"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 245, 255, 0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "0.75rem 0.5rem", color: meta.color, fontWeight: 700 }}>
                  {meta.label}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  L-{inc.location?.floor ?? "X"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-muted)" }}>
                  {inc.location?.zone?.toUpperCase() ?? "UNKNOWN"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem", opacity: 0.7 }}>
                  {inc.location?.room ?? "---"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{
                      height: "3px",
                      width: "30px",
                      background: "rgba(255,255,255,0.05)",
                      position: "relative"
                    }}>
                       <div style={{
                        height: "100%",
                        width: `${(inc.confidence ?? 0) * 100}%`,
                        background: meta.color,
                        boxShadow: `0 0 5px ${meta.color}`
                      }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.55rem", opacity: 0.6 }}>
                  {inc.source_type ?? "SENS_ARRAY"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <span style={{ color: statusMeta.color, fontWeight: 700 }}>
                    {statusMeta.label}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-muted)" }}>
                  {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour12: false }) : "--:--:--"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
