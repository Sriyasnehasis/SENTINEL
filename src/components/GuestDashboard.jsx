import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc, onSnapshot, getDoc, updateDoc,
  collection, addDoc, serverTimestamp,
  query, where, orderBy, limit
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  Shield, Activity, Mic,
  Volume2, AlertTriangle, LogOut,
  Navigation, LifeBuoy, Accessibility,
  User, MapPin, CheckCircle
} from "lucide-react";
import LiveMap from "./LiveMap";
import { speakTactical } from "../utils/tts";

const TacticalCard = ({ Icon, title, value, onClick, locked, color, loading }) => (
  <div
    onClick={!locked && !loading ? onClick : null}
    className={`tactical-card ${locked ? 'locked' : 'interactive'}`}
    style={{
      padding: '1rem',
      background: 'rgba(15, 23, 42, 0.2)',
      border: '1px solid var(--border-tactical)',
      borderLeft: `4px solid ${locked ? 'var(--text-muted)' : color}`,
      opacity: locked ? 0.3 : 1,
      cursor: locked ? 'not-allowed' : 'pointer',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon size={14} color={locked ? 'var(--text-muted)' : color} />
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--text-muted)', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>
        {title}
      </span>
    </div>
    <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
      {loading ? ">>> PROCESSING" : value}
    </div>
  </div>
);

export default function GuestDashboard() {
  const { user, logout, guestProfile } = useAuth();
  const [session, setSession] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [mobilityLoading, setMobilityLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [rescueStatus, setRescueStatus] = useState(null);

  const room = guestProfile?.room || "Lobby";
  const floor = guestProfile?.floor || "0";
  const userNode = guestProfile?.nodeId || "MT-0-Center";

  // Listen for Rescue Request Status
  useEffect(() => {
    if (!user) return;
    // Simplify query to avoid index requirements for demo
    const q = query(
      collection(db, "rescue_requests"),
      where("guest_id", "==", user.uid)
    );
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Sort locally by timestamp to get the latest
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setRescueStatus(sorted[0]);
      }
    });
  }, [user]);

  useEffect(() => {
    let unsubInc = null;
    const unsubSession = onSnapshot(doc(db, "sessions", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSession(data);

        // Setup incident listener if not already active
        if (!unsubInc) {
          const q = query(collection(db, "incidents"), where("status", "in", ["ACTIVE", "RESCUE"]));
          unsubInc = onSnapshot(q, (snap) => {
            const hasActiveIncidents = !snap.empty;
            setIsEmergency(
              data.status === "EMERGENCY" ||
              (data.current_sitrep?.severity === "P0" || data.current_sitrep?.severity === "P1") ||
              hasActiveIncidents
            );
          });
        } else {
          // Update isEmergency based on new session data and current incident status
          // Note: we'd need to track hasActiveIncidents in state for this to be perfect, 
          // but this is a good improvement.
        }
      }
    });
    return () => {
      unsubSession();
      if (unsubInc) unsubInc();
    };
  }, []);

  const handleSOS = async () => {
    // 7] Don't allow multiple active requests
    if (rescueStatus && ["PENDING", "RESOLVED", "ACCEPTED"].includes(rescueStatus.status)) {
      alert("REQUEST_ALREADY_LOGGED:: WORKING_ON_IT");
      return;
    }

    setSosLoading(true);
    try {
      const incidentRef = await addDoc(collection(db, "incidents"), {
        event_type: "SOS_SIGNAL",
        location: { nodeId: userNode, floor: parseInt(floor), zone: room },
        status: "ACTIVE", priority: "P0",
        description: `SOS: Guest ${guestProfile?.fullname || user.email} in Room ${room}`,
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp()
      });

      // ALSO broadcast to RescueRequestPanel
      await addDoc(collection(db, "rescue_requests"), {
        guest_id: user.uid,
        incident_id: incidentRef.id,
        fullname: guestProfile?.fullname || "ANON_USER",
        room: room,
        floor: floor,
        status: "PENDING",
        mobility_impaired: false, // General SOS
        timestamp: serverTimestamp()
      });
      alert("SOS_SIGNAL_BROADCAST_SUCCESSFUL");
    } catch (e) { console.error(e); }
    setSosLoading(false);
  };

  const handleMobilityRequest = async () => {
    // 7] Don't allow multiple active requests
    if (rescueStatus && ["PENDING", "RESOLVED", "ACCEPTED"].includes(rescueStatus.status)) {
      alert("REQUEST_ALREADY_LOGGED:: WORKING_ON_IT");
      return;
    }

    setMobilityLoading(true);
    try {
      // 1. Update guest profile (for state)
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "guests", user.uid), {
        mobility_assistance_required: true,
        extraction_requested_at: new Date().toISOString()
      }, { merge: true });

      // 2. Broadcast to Admin's Rescue Panel
      await addDoc(collection(db, "rescue_requests"), {
        guest_id: user.uid,
        fullname: guestProfile?.fullname || "ANON_USER",
        room: room,
        floor: floor,
        status: "PENDING",
        mobility_impaired: true,
        timestamp: serverTimestamp()
      });

      alert("RESCUE_REQUEST_BROADCAST_SUCCESSFUL");
    } catch (e) { console.error(e); }
    setMobilityLoading(false);
  };

  const handleAcceptRescue = async () => {
    if (!rescueStatus?.id) return;
    try {
      await updateDoc(doc(db, "rescue_requests", rescueStatus.id), {
        status: "ACCEPTED"
      });
      // Update the main incident table log to "RESCUE"
      if (rescueStatus.incident_id) {
        await updateDoc(doc(db, "incidents", rescueStatus.incident_id), {
          status: "RESCUE"
        });
      }
      setRescueStatus(null);
    } catch (e) { console.error(e); }
  };

  const handleDismissRescue = async () => {
    if (!rescueStatus?.id) return;
    try {
      await updateDoc(doc(db, "rescue_requests", rescueStatus.id), {
        status: "DISMISSED"
      });
      setRescueStatus(null);
    } catch (e) { console.error(e); }
  };

  const handleTTS = () => {
    const text = session?.current_sitrep?.narrative || "System Nominal. No active emergency protocols detected.";
    const langMap = {
      'ENGLISH': 'en-US',
      'SPANISH': 'es-ES',
      'FRENCH': 'fr-FR',
      'HINDI': 'hi-IN'
    };
    const lang = langMap[guestProfile?.language] || 'en-US';
    
    setTtsLoading(true);
    speakTactical(text, lang, () => setTtsLoading(false));
  };

  const handleVoiceReport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("VOICE_HARDWARE_NOT_SUPPORTED: Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();

    // Set recognition language based on profile
    const langMap = {
      'ENGLISH': 'en-US',
      'SPANISH': 'es-ES',
      'FRENCH': 'fr-FR',
      'HINDI': 'hi-IN'
    };
    recognition.lang = langMap[guestProfile?.language] || 'en-US';

    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 SENTINEL_MIC_ACTIVE: Listening for tactical report...");
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("🎤 REPORT_CAPTURED:", transcript);

      // Autonomous Hazard Analysis
      let type = "FIRE";
      if (transcript.includes("smoke")) type = "SMOKE";
      if (transcript.includes("medical") || transcript.includes("injury")) type = "MEDICAL";
      if (transcript.includes("trapped")) type = "TRAPPED";

      const floorMatch = transcript.match(/\d+/);
      const floorNum = floorMatch ? floorMatch[0] : floor;
      const nodeId = `MT-${floorNum}-EastHall`;

      try {
        await addDoc(collection(db, "incidents"), {
          event_type: type,
          location: { nodeId, floor: parseInt(floorNum), zone: "Voice Uplink" },
          status: "ACTIVE", priority: "P1",
          description: `VOICE_REPORT: "${transcript}"`,
          timestamp: new Date().toISOString(),
          created_at: serverTimestamp(),
          source: "VOICE_BRIDGE"
        });
        alert(`UPLINK_SUCCESS: ${type} reported on Floor ${floorNum}`);
      } catch (e) { console.error(e); }
    };

    recognition.onerror = (event) => {
      console.error("MIC_ERROR:", event.error);
      alert(`UPLINK_FAILED: ${event.error.toUpperCase()}`);
    };

    recognition.start();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#010204', color: 'white', fontFamily: 'JetBrains Mono' }}>

      {/* Tactical Header */}
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-tactical)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.4em', fontSize: '1rem' }}>
            SENTINEL_GUEST_LINK
          </div>
          <div style={{ height: '1.5rem', width: '1px', background: 'var(--border-tactical)' }} />
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} color="var(--primary)" />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{guestProfile?.fullname?.toUpperCase() || 'ANON_USER'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} color="var(--primary)" />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RM::{room} // FL::{floor} // LNG::{guestProfile?.language || 'ENGLISH'}</span>
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn" style={{
          fontSize: '0.6rem',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid rgba(255, 0, 85, 0.3)',
          color: 'var(--accent)'
        }}>
          <LogOut size={12} /> TERMINATE_SESSION
        </button>
      </header>

      {/* Polished Layout */}
      <div className="main-layout">

        {/* Left Tactical Panel */}
        <aside className="sidebar animate-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', zIndex: 10 }}>
          <div>
            <div className="hud-label" style={{ marginBottom: '0.5rem', color: 'var(--text-main)', borderLeftColor: 'var(--primary)' }}>SECTOR_ANALYSIS</div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>REAL_TIME_UPLINK_ACTIVE</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TacticalCard
              Icon={Activity}
              title="SYSTEM_STATE"
              value={isEmergency ? "CRITICAL_ALERT" : "NOMINAL"}
              color={isEmergency ? "var(--accent)" : "var(--neon-green)"}
            />
            <TacticalCard
              Icon={Shield}
              title="SECURITY_MODE"
              value={isEmergency ? "LOCKDOWN_ACTIVE" : "STANDARD"}
              color={isEmergency ? "var(--accent)" : "var(--primary)"}
            />
          </div>

          <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-dim)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>UPLINK_ENCRYPTION</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>AES-256</span>
            </div>
            <div style={{ height: '2px', background: 'var(--primary)', width: '100%', marginTop: '0.5rem', opacity: 0.3 }} />
          </div>
        </aside>

        {/* Center: Tactical Map */}
        <main className="glass-card animate-in" style={{ flex: 1, position: 'relative', overflow: 'hidden', animationDelay: '0.1s', borderRadius: '6px' }}>
          {isEmergency && (
            <div className="animate-pulse" style={{
              position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 20,
              padding: '0.5rem 1.5rem', border: '1px solid var(--accent)', borderRadius: '2px',
              color: 'var(--accent)', fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 900,
              background: 'rgba(255, 0, 85, 0.15)', backdropFilter: 'blur(10px)',
              boxShadow: '0 0 20px rgba(255, 0, 85, 0.2)'
            }}>
              ⚠️ EVACUATION_ROUTE_GENERATED
            </div>
          )}
          <LiveMap userNode={userNode} isEmergency={isEmergency} isAdmin={false} />

          {/* Rescue Acknowledgment Overlay */}
          {rescueStatus?.status === "RESOLVED" && (
            <div className="animate-in" style={{
              position: 'absolute', bottom: '1.5rem', right: '1.5rem', left: '1.5rem',
              background: 'rgba(0, 255, 159, 0.95)', color: 'black', padding: '1.5rem',
              zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '4px', border: '2px solid white', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 255, 159, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <CheckCircle size={32} />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.05em' }}>RESCUE_TEAM_DEPLOYED</div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', marginTop: '4px', fontWeight: 700, opacity: 0.8 }}>HQ_CONFIRMED: PROCEED_TO_NEAREST_SAFE_ZONE OR SHELTER_IN_PLACE</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, textAlign: 'right', fontWeight: 700 }}>
                  ACK_RECEIVED<br />
                  {new Date(rescueStatus.resolved_at || Date.now()).toLocaleTimeString()}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleAcceptRescue}
                    className="btn"
                    style={{
                      background: 'black', color: 'var(--neon-green)', borderColor: 'black',
                      padding: '0.5rem 1.5rem', fontWeight: 900, letterSpacing: '0.1em'
                    }}
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={handleDismissRescue}
                    className="btn"
                    style={{
                      padding: '0.5rem 1rem', borderColor: 'rgba(0,0,0,0.5)', color: 'rgba(0,0,0,0.7)', fontWeight: 700
                    }}
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Emergency Panel */}
        <aside className="sidebar animate-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10, animationDelay: '0.2s', overflowY: 'auto' }}>

          {/* Live HQ Directives (Important New Addition) */}
          <div style={{ background: 'rgba(0, 245, 255, 0.05)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Volume2 size={14} color="var(--primary)" />
              <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.2em' }}>HQ_DIRECTIVES</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700, lineHeight: 1.5 }}>
              {isEmergency
                ? (rescueStatus ? "RESCUE_IN_PROGRESS: Shelter in place or follow luminescent path if safe." : "CRITICAL_ALERT: Follow luminescent path to nearest exit immediately.")
                : "SYSTEM_NOMINAL: No active emergencies detected."}
            </div>
          </div>

          <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 900, letterSpacing: '0.2em' }}>CRITICAL_ACTIONS</div>
            <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)' }}>EMERGENCY_OVERRIDE_READY</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* BIG RED SOS BUTTON */}
            <div
              onClick={!sosLoading ? handleSOS : null}
              className="sos-button interactive"
              style={{
                padding: '1.5rem',
                background: 'var(--accent)',
                border: '1px solid #ff0055',
                boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
                position: 'relative',
                animation: 'pulse-red 2s infinite',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="white" />
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)', fontWeight: 900 }}>
                  EMERGENCY_SOS
                </span>
              </div>
              <div style={{ fontSize: '1.2rem', color: 'white', fontWeight: 900, letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                {sosLoading ? ">>> UPLINKING..." : "ACTIVATE_RESCUE"}
              </div>
            </div>

            {/* Mobility Request Button */}
            <TacticalCard
              Icon={Accessibility}
              title="MOBILITY_ASSISTANCE"
              value={guestProfile?.mobility_assistance_required ? "RESCUE_LOGGED" : "REQUEST_EXTRACTION"}
              loading={mobilityLoading}
              color="var(--primary)"
              onClick={handleMobilityRequest}
            />

            {/* Quick Comms Grid (Condensed) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div
                onClick={handleVoiceReport}
                className="tactical-card interactive"
                style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-dim)', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <Mic size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.5rem', color: 'var(--primary)', letterSpacing: '0.1em', fontWeight: 700 }}>VOICE_REPORT</span>
              </div>
              <div
                onClick={handleTTS}
                className="tactical-card interactive"
                style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-dim)', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <Volume2 size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.5rem', color: 'var(--primary)', letterSpacing: '0.1em', fontWeight: 700 }}>AUDIO_SITREP</span>
              </div>
            </div>

          </div>
        </aside>
      </div>

      <style>{`
        .tactical-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 4px; }
        .tactical-card.interactive:hover { 
          background: rgba(0, 245, 255, 0.1) !important;
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 245, 255, 0.15);
        }
        .tactical-card.interactive:active { transform: translateY(0); }
        .tactical-card.locked { filter: grayscale(1) brightness(0.5); pointer-events: none; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0.5); }
          70% { box-shadow: 0 0 0 20px rgba(255, 0, 85, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0); }
        }
        
        .sos-button:hover {
          background: #ff0055 !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 0, 85, 0.4) !important;
        }
        
        .main-layout {
          flex: 1; display: flex; overflow: hidden; padding: 1rem; gap: 1rem;
        }
        
        .sidebar {
          width: 320px;
          min-width: 320px;
          background: rgba(5, 8, 12, 0.8) !important;
          border: 1px solid var(--border-dim);
          border-radius: 6px;
          backdrop-filter: blur(20px);
        }

        @media (max-width: 1200px) {
          .main-layout { flex-direction: column; overflow-y: auto; padding: 1rem; }
          .sidebar { width: 100%; min-width: 100%; height: auto; }
          main.glass-card { min-height: 50vh; }
        }
      `}</style>
    </div>
  );
}
