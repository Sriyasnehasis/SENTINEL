import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { Flame, Wind, UserX, Activity, Clock, MapPin, AlertTriangle } from "lucide-react";

const EVENT_META = {
  FIRE:    { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   label: "🔥 FIRE",    icon: Flame },
  SMOKE:   { color: "#f97316", bg: "rgba(249,115,22,0.15)",  label: "💨 SMOKE",   icon: Wind },
  TRAPPED: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  label: "🆘 TRAPPED", icon: UserX },
  MEDICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.15)",  label: "🏥 MEDICAL", icon: Activity },
  INJURY:  { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  label: "⚠️ INJURY",  icon: AlertTriangle },
  PANIC:   { color: "#ec4899", bg: "rgba(236,72,153,0.15)",  label: "😱 PANIC",   icon: AlertTriangle },
};

const STATUS_META = {
  ACTIVE:       { color: "#ef4444", label: "● ACTIVE" },
  INVESTIGATING:{ color: "#f97316", label: "◐ INVESTIGATING" },
  RESOLVED:     { color: "#22c55e", label: "✓ RESOLVED" },
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
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        <div className="pulse-loader" />
        <p style={{ marginTop: "1rem" }}>Connecting to incident stream...</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
        <AlertTriangle size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
        <p style={{ fontSize: "1.1rem" }}>No active incidents</p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          System is nominal. Waiting for sensor data...
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Type", "Floor", "Zone", "Room", "Confidence", "Source", "Status", "Time"].map((h) => (
              <th key={h} style={{
                padding: "0.75rem 1rem",
                textAlign: "left",
                color: "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc, idx) => {
            const meta = EVENT_META[inc.event_type] || {
              color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: inc.event_type
            };
            const statusMeta = STATUS_META[inc.status] || { color: "#94a3b8", label: inc.status };
            return (
              <tr
                key={inc.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={{
                    background: meta.bg,
                    color: meta.color,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    border: `1px solid ${meta.color}33`,
                  }}>{meta.label}</span>
                </td>
                <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                  Floor {inc.location?.floor ?? "—"}
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <MapPin size={12} /> {inc.location?.zone ?? "—"}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace" }}>
                  {inc.location?.room ?? "—"}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{
                      height: "6px", borderRadius: "3px",
                      width: `${Math.round((inc.confidence ?? 0) * 60)}px`,
                      background: inc.confidence > 0.85 ? "#ef4444" : inc.confidence > 0.7 ? "#f97316" : "#22c55e",
                      transition: "width 0.3s",
                    }} />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {Math.round((inc.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {inc.source_type?.replace("_", " ") ?? "—"}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={{ color: statusMeta.color, fontWeight: 600, fontSize: "0.78rem" }}>
                    {statusMeta.label}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Clock size={11} />
                    {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString() : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
