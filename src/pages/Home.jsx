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
import GuestDashboard from "../components/GuestDashboard";
import RescueRequestPanel from "../components/RescueRequestPanel";
import Navbar from "../components/Navbar";

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
    return <GuestDashboard />;
  }

  return (
    <div className="container animate-in" style={{ padding: 0 }}>
      <Navbar />
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
        
        {/* Left Side: Admin Tactical HUD */}
        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '6rem', overflowY: 'auto', maxHeight: '100vh', paddingBottom: '3rem' }}>

          {/* ─── Compact Admin Header Strip ──────────────────────── */}
          <div style={{
            background: 'rgba(10,14,22,0.8)',
            border: '1px solid rgba(0,245,255,0.15)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: '6px',
            padding: '0.65rem 0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '4px', flexShrink: 0,
                background: 'rgba(255,0,85,0.12)', border: '1px solid rgba(255,0,85,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={14} color="var(--accent)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>ADMIN_OPERATOR</div>
                <div style={{ fontSize: '0.5rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.12em' }}>
                  {user?.email?.split('@')[0]?.toUpperCase() || 'ADMIN'} · LVL-5
                </div>
              </div>
            </div>
            {/* 3 inline stat pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {[
                { label: 'ACTV', val: stats.active, color: stats.active > 0 ? 'var(--accent)' : 'var(--neon-green)' },
                { label: 'EVNT', val: stats.total,  color: 'var(--primary)' },
                { label: 'SEC',  val: stats.resolved, color: 'var(--neon-green)' }
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(0,0,0,0.4)', border: `1px solid ${s.color}55`,
                  borderTop: `2px solid ${s.color}`,
                  borderRadius: '5px', padding: '0.4rem 0.65rem', textAlign: 'center', minWidth: '46px'
                }}>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── System Health (single slim bar) ─────────────────── */}
          <div style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '6px',
            background: systemStatus === 'CRITICAL' ? 'rgba(255,0,85,0.07)' : systemStatus === 'WARNING' ? 'rgba(255,159,0,0.07)' : 'rgba(0,255,159,0.04)',
            border: `1px solid ${sysDisplay.color}33`,
            borderLeft: `3px solid ${sysDisplay.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
            animation: systemStatus === 'CRITICAL' ? 'pulse-red 2s infinite' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: sysDisplay.color, boxShadow: `0 0 8px ${sysDisplay.color}`,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: sysDisplay.color, letterSpacing: '0.05em' }}>
                {sysDisplay.label}
              </span>
            </div>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
          </div>

          {/* ─── Tactical Analysis (SitRep) ──────────────────────── */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-dim)',
            borderRadius: '6px',
            padding: '1rem',
            flex: 1,
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            minHeight: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-dim)' }}>
              <Activity size={14} color="var(--primary)" />
              <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.2em' }}>TACTICAL_ANALYSIS</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <SitRepPanel focusedIncident={focusedIncident} />
            </div>
          </div>

          {/* ─── Command Terminal ─────────────────────────────────── */}
          <div style={{ 
            background: 'var(--bg-panel)',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid var(--border-dim)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border-dim)',
              paddingBottom: '0.6rem', marginBottom: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.15em' }}>AUTH_CMD_TERMINAL_v2.0</span>
              </div>
              <span style={{ fontSize: '0.52rem', color: 'var(--neon-green)', fontFamily: 'JetBrains Mono' }}>[SECURE_LINK_ACTIVE]</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', height: '50px' }}>
              <div style={{ flex: 1 }}><DemoButton /></div>
              <div style={{ flex: 1 }}><ZoneClearButton staffId={user?.uid || "demo-staff"} zone="MT-4-EastHall" /></div>
            </div>

            {/* Scanline overlay */}
            <div style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))',
              backgroundSize: '100% 4px, 3px 100%',
              pointerEvents: 'none', opacity: 0.25
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
            <LiveMap isAdmin={true} />
          </div>
        </div>

        {/* Far Right: Vertical Stream Sidebar */}
        <div style={{ gridColumn: 'span 3', height: 'calc(100vh - 3rem)' }}>
          <div className="glass-card" style={{ height: '100%', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div className="hud-label" style={{ marginBottom: '1rem', fontSize: '0.5rem' }}>INCIDENT_STREAM_V3.0</div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <RescueRequestPanel />
              <div style={{ marginTop: '1.5rem' }}>
                <IncidentTable 
                  focusedIncidentId={focusedIncident?.id} 
                  onFocus={(inc) => setFocusedIncident(inc)} 
                />
              </div>
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
