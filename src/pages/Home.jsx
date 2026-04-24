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
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ active: 0, total: 0, resolved: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [systemStatus, setSystemStatus] = useState("NOMINAL");
  const [focusedIncident, setFocusedIncident] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "incidents"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const active = all.filter((i) => i.status === "ACTIVE").length;
      const resolved = all.filter((i) => i.status === "RESOLVED").length;
      setStats({ active, total: all.length, resolved });
      setLastUpdated(new Date());
      setSystemStatus(active > 0 ? (active >= 3 ? "CRITICAL" : "WARNING") : "NOMINAL");
      
      if (focusedIncident) {
        const stillActive = all.find(i => i.id === focusedIncident.id && i.status === "ACTIVE");
        if (!stillActive) setFocusedIncident(null);
      }
    });
    return () => unsub();
  }, [focusedIncident]);

  const statusConfig = {
    NOMINAL:   { color: "var(--neon-green)", label: "SYSTEM_NOMINAL" },
    WARNING:   { color: "var(--neon-orange)", label: "SYSTEM_WARNING" },
    CRITICAL:  { color: "var(--accent)", label: "SYSTEM_CRITICAL" },
  };
  const sysDisplay = statusConfig[systemStatus];

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-void)", padding: "2rem" }}>
        <div className="glass-card animate-in" style={{ padding: "4rem", textAlign: "center", border: "1px solid var(--primary-glow)", maxWidth: "600px" }}>
          <div className="hud-label" style={{ marginBottom: "2rem", borderLeftColor: "var(--primary)" }}>S_NODE_USER_ACCESS</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)", marginBottom: "1rem", letterSpacing: "0.1em" }}>USER_TERMINAL</h1>
          <p style={{ color: "var(--text-muted)", fontFamily: "JetBrains Mono", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Welcome to the Sentinel interface. You are currently logged in with limited privileges. 
            Full command authorization is restricted to administrative personnel.
          </p>
          <div style={{ marginTop: "3rem", height: "1px", background: "linear-gradient(90deg, transparent, var(--primary), transparent)", opacity: 0.3 }} />
          <div style={{ marginTop: "1rem", fontSize: "0.6rem", color: "var(--primary)", fontFamily: "JetBrains Mono" }}>THIS IS USER WINDOW // ACCESS_LEVEL: 0</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-in" style={{ padding: 0 }}>
      {/* Background HUD Overlay */}
      <div style={{
        position: 'fixed',
        top: '2rem',
        left: '2rem',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <div className="hud-label">S_NODE_ALPHA // ADMIN_LIVE</div>
        <h1 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginTop: '0.5rem', letterSpacing: '0.2em' }}>
          SENTINEL_OS
        </h1>
      </div>

      <div className="asymmetric-layout" style={{ minHeight: '100vh', padding: '1.5rem' }}>
        
        {/* Left Side: Stats & SitRep */}
        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '6rem' }}>
          
          {/* Scattered Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {[
              { label: "ACTV", val: stats.active, color: stats.active > 0 ? "var(--accent)" : "var(--neon-green)" },
              { label: "EVNT", val: stats.total, color: "var(--primary)" },
              { label: "SYNC", val: "LIVE", color: "var(--neon-green)" }
            ].map(s => (
              <div key={s.label} className="glass-card" style={{ padding: '1rem', minWidth: '100px', flex: '1' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 300, color: s.color, fontFamily: 'JetBrains Mono' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Floating SitRep */}
          <div className="glass-card" style={{ padding: '1.5rem', flex: '1' }}>
            <div className="hud-label" style={{ marginBottom: '1rem' }}>TACTICAL_ANALYSIS</div>
            <SitRepPanel focusedIncident={focusedIncident} />
          </div>

          <div style={{ 
            background: 'var(--bg-panel)',
            padding: '1rem',
            borderRadius: '2px',
            border: '1px solid var(--border-dim)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid var(--border-dim)',
              paddingBottom: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div className="hud-label" style={{ borderLeftColor: 'var(--primary)', color: 'var(--primary)' }}>AUTH_CMD_TERMINAL_v2.0</div>
              <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>[SECURE_LINK_ACTIVE]</div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', height: '50px' }}>
              <div style={{ flex: 1 }}>
                <DemoButton />
              </div>
              <div style={{ flex: 1 }}>
                <ZoneClearButton staffId={user?.uid || "demo-staff"} zone="MT-4-EastHall" />
              </div>
            </div>

            {/* Matrix-like scanline overlay */}
            <div style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 4px, 3px 100%',
              pointerEvents: 'none',
              opacity: 0.3
            }} />
          </div>
        </div>

        {/* Center/Right: The Orbital Map View */}
        <div style={{ gridColumn: 'span 6', position: 'relative' }}>
          <div className="glass-card" style={{ height: 'calc(100vh - 3rem)', padding: '0.5rem' }}>
            <div style={{ 
              position: 'absolute', 
              top: '1.5rem', 
              right: '1.5rem', 
              zIndex: 10,
              fontFamily: 'JetBrains Mono',
              fontSize: '0.6rem',
              color: sysDisplay.color
            }}>
              {sysDisplay.label} // {lastUpdated?.toLocaleTimeString()}
            </div>
            <LiveMap />
          </div>
        </div>

        {/* Far Right: Vertical Stream Sidebar */}
        <div style={{ gridColumn: 'span 3', height: 'calc(100vh - 3rem)' }}>
          <div className="glass-card" style={{ height: '100%', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div className="hud-label" style={{ marginBottom: '1rem', fontSize: '0.5rem' }}>INCIDENT_STREAM_V3.0</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <IncidentTable 
                focusedIncidentId={focusedIncident?.id} 
                onFocus={(inc) => setFocusedIncident(inc)} 
              />
            </div>
          </div>
        </div>

      </div>

      <DialogflowWidget />
      
      {/* Dynamic Status Bar */}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '2rem',
        right: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.55rem',
        color: 'var(--text-muted)',
        fontFamily: 'JetBrains Mono',
        pointerEvents: 'none',
        zIndex: 100
      }}>
        <div>GSC_2026 // NODE_STABLE // {user?.email} // ROLE: ADMIN</div>
        <div>SCAN_RADAR: ACTIVE // DIJKSTRA_RESOLVING</div>
      </div>
    </div>
  );
}
