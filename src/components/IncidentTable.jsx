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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {incidents.map((inc, idx) => {
        const meta = EVENT_META[inc.event_type] || {
          color: "var(--text-muted)", label: inc.event_type
        };
        const statusMeta = STATUS_META[inc.status] || { color: "var(--text-muted)", label: inc.status };
        const timeStr = inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : "--:--";

        return (
          <div
            key={inc.id}
            onClick={() => {
              if (inc.location?.nodeId) {
                window.dispatchEvent(new CustomEvent('sentinel-focus-node', { detail: inc.location.nodeId }));
              }
            }}
            style={{
              padding: "0.8rem 1rem",
              borderLeft: `2px solid ${inc.status === 'ACTIVE' ? 'var(--accent)' : 'var(--border-dim)'}`,
              background: "rgba(15, 23, 42, 0.3)",
              cursor: inc.location?.nodeId ? "pointer" : "default",
              fontFamily: "JetBrains Mono",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "var(--transition-heavy)",
              animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 245, 255, 0.08)";
              e.currentTarget.style.borderLeftColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.3)";
              e.currentTarget.style.borderLeftColor = inc.status === 'ACTIVE' ? 'var(--accent)' : 'var(--border-dim)';
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: "10px" }}>
                <span style={{ fontWeight: 700 }}>{timeStr}</span>
                <span>//</span>
                <span style={{ color: "var(--text-main)", opacity: 0.9 }}>L-{inc.location?.floor ?? "X"}</span>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: meta.color, letterSpacing: "0.1em" }}>
                {meta.label}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {inc.location?.zone?.toUpperCase() ?? "UNKNOWN_SECTOR"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ 
                fontSize: "0.65rem", 
                fontWeight: 800, 
                color: statusMeta.color, 
                border: `1px solid ${statusMeta.color}44`,
                padding: "3px 8px",
                borderRadius: "2px",
                background: `${statusMeta.color}11`
              }}>
                {statusMeta.label}
              </div>
              {inc.location?.room && (
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "6px", fontWeight: 600 }}>
                  RM::{inc.location.room}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
