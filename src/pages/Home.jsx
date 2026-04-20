import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, query, where, orderBy,
  addDoc, serverTimestamp
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Shield, Activity, AlertTriangle, CheckCircle, Wifi, Clock, MapPin } from "lucide-react";
import IncidentTable from "../components/IncidentTable";
import SitRepPanel from "../components/SitRepPanel";
import LiveMap from "../components/LiveMap";
import DialogflowWidget from "../components/DialogflowWidget";
import ZoneClearButton from "../components/ZoneClearButton";
import DemoButton from "../components/DemoButton";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, total: 0, resolved: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [systemStatus, setSystemStatus] = useState("NOMINAL");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "incidents"), (snap) => {
      const all = snap.docs.map((d) => d.data());
      const active = all.filter((i) => i.status === "ACTIVE").length;
      const resolved = all.filter((i) => i.status === "RESOLVED").length;
      setStats({ active, total: all.length, resolved });
      setLastUpdated(new Date());
      setSystemStatus(active > 0 ? (active >= 3 ? "CRITICAL" : "WARNING") : "NOMINAL");
    });
    return () => unsub();
  }, []);

  const statusConfig = {
    NOMINAL:   { color: "#22c55e", label: "● NOMINAL",   bg: "rgba(34,197,94,0.1)" },
    WARNING:   { color: "#f97316", label: "⚠ WARNING",   bg: "rgba(249,115,22,0.1)" },
    CRITICAL:  { color: "#ef4444", label: "🚨 CRITICAL", bg: "rgba(239,68,68,0.1)" },
  };
  const sysDisplay = statusConfig[systemStatus];

  return (
    <div className="container animate-in">

      {/* Header */}
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <Shield size={28} color="#6366f1" />
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                SENTINEL Command Center
              </h1>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Smart Emergency Network for Tactical Intelligence &amp; Life-saving
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* System Status Badge */}
            <div style={{
              background: sysDisplay.bg,
              border: `1px solid ${sysDisplay.color}44`,
              borderRadius: "999px",
              padding: "0.5rem 1.25rem",
              color: sysDisplay.color,
              fontWeight: 700,
              fontSize: "0.85rem",
            }}>
              {sysDisplay.label}
            </div>
            {lastUpdated && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                <Clock size={12} />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            icon: AlertTriangle, label: "Active Incidents", value: stats.active,
            color: stats.active > 0 ? "#ef4444" : "#22c55e",
            bg: stats.active > 0 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
          },
          {
            icon: Activity, label: "Total Events", value: stats.total,
            color: "#6366f1", bg: "rgba(99,102,241,0.1)",
          },
          {
            icon: CheckCircle, label: "Resolved", value: stats.resolved,
            color: "#22c55e", bg: "rgba(34,197,94,0.1)",
          },
          {
            icon: Wifi, label: "Data Source", value: "LIVE",
            color: "#6366f1", bg: "rgba(99,102,241,0.1)",
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div style={{ background: bg, borderRadius: "6px", padding: "0.35rem" }}>
                <Icon size={14} color={color} />
              </div>
              {label}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Incident Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
              Live Incident Stream
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Real-time feed from IoT sensors, voice reports, and staff alerts
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: "#22c55e", fontSize: "0.8rem", fontWeight: 600,
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
              animation: "pulse 1.5s infinite",
              display: "inline-block",
            }} />
            Firestore Live
          </div>
        </div>
        <IncidentTable />
      </div>

      {/* AI Situation Report Panel */}
      <div className="glass-card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
              🤖 AI Situation Report
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Gemini-powered crisis analysis and evacuation guidance
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: "#6366f1", fontSize: "0.8rem", fontWeight: 600,
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 6px #6366f1",
              animation: "pulse 2s infinite",
              display: "inline-block",
            }} />
            Gemini 2.0 Flash
          </div>
        </div>
        <SitRepPanel />
      </div>

      {/* Live Map & Evacuation Routing */}
      <div className="glass-card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
              <MapPin size={20} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
              Live Evacuation Map
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Real-time incident tracking with dynamic evacuation route calculation
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: "#22c55e", fontSize: "0.8rem", fontWeight: 600,
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
              animation: "pulse 2s infinite",
              display: "inline-block",
            }} />
            Dijkstra Routing Active
          </div>
        </div>
        <LiveMap />
      </div>

      {/* Emergency Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Demo Control Panel */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>
            🎬 Demo Control
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1rem" }}>
            Run the scripted 90-second demo scenario for judges
          </p>
          <DemoButton />
        </div>

        {/* Zone Clear Control */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>
            ✅ Zone Clearance
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1rem" }}>
            Mark zones as cleared and play multilingual announcements
          </p>
          <ZoneClearButton staffId={user?.uid || "demo-staff"} zone="4-EastWing" />
        </div>
      </div>

      {/* Dialogflow Voice Widget */}
      <DialogflowWidget />

      {/* Footer */}
      <div style={{ marginTop: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
        Logged in as <strong>{user?.email}</strong> · Google Solution Challenge 2026 · Deadline: April 28, 2026
      </div>
    </div>
  );
}
