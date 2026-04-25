import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  doc, onSnapshot, getDoc, updateDoc, 
  collection, addDoc, serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { 
  Shield, Activity, Mic, 
  Volume2, AlertTriangle, LogOut, 
  Navigation, LifeBuoy, Accessibility,
  User, MapPin
} from "lucide-react";
import LiveMap from "./LiveMap";

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

  const room = guestProfile?.room || "412";
  const floor = guestProfile?.floor || "4";
  const userNode = floor === 0 ? "MT-G-Lobby" : `MT-${floor}-EastHall`;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", "current"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSession(data);
        setIsEmergency(data.current_sitrep?.severity === "P0" || data.current_sitrep?.severity === "P1");
      }
    });
    return () => unsub();
  }, []);

  const handleSOS = async () => {
    setSosLoading(true);
    try {
      await addDoc(collection(db, "incidents"), {
        event_type: "SOS_SIGNAL",
        location: { nodeId: userNode, floor: parseInt(floor), zone: "Guest Room" },
        status: "ACTIVE", priority: "P0",
        description: `SOS: Guest ${guestProfile?.fullname || user.email} in Room ${room}`,
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp()
      });
      alert("SOS_SIGNAL_BROADCAST_SUCCESSFUL");
    } catch (e) { console.error(e); }
    setSosLoading(false);
  };

  const handleMobilityRequest = async () => {
    setMobilityLoading(true);
    try {
      // 1. Update guest profile (for state)
      await updateDoc(doc(db, "guests", user.uid), {
        mobility_assistance_required: true,
        extraction_requested_at: new Date().toISOString()
      });

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

  const handleTTS = () => {
    const text = session?.current_sitrep?.narrative || "System Nominal. No active emergency protocols detected.";
    setTtsLoading(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setTtsLoading(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceReport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("VOICE_HARDWARE_NOT_SUPPORTED: Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
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
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RM::{room} // FL::{floor}</span>
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

      {/* Asymmetric Layout mirroring Admin Dashboard */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Tactical Panel */}
        <aside style={{ width: '320px', borderRight: '1px solid var(--border-tactical)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0, 0, 0, 0.4)' }}>
          <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.2em' }}>SECTOR_ANALYSIS</div>
            <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)' }}>REAL_TIME_UPLINK_ACTIVE</div>
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

          <div style={{ marginTop: 'auto', padding: '1rem', border: '1px dashed var(--border-tactical)', borderRadius: '2px' }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>UPLINK_ENCRYPTION</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--primary)' }}>AES-256_ACTIVE</div>
          </div>
        </aside>

        {/* Center: Tactical Map */}
        <main style={{ flex: 1, position: 'relative', background: '#010204' }}>
          {isEmergency && (
            <div className="animate-pulse" style={{ 
              position: 'absolute', top: '2rem', left: '2rem', zIndex: 10,
              padding: '0.5rem 1.5rem', border: '1px solid var(--accent)',
              color: 'var(--accent)', fontSize: '0.6rem', letterSpacing: '0.3em',
              background: 'rgba(255, 0, 85, 0.1)', backdropFilter: 'blur(5px)'
            }}>
              ⚠️ EVACUATION_ROUTE_GENERATED
            </div>
          )}
          <LiveMap userNode={userNode} isEmergency={isEmergency} />
        </main>

        {/* Right Emergency Panel */}
        <aside style={{ width: '320px', borderLeft: '1px solid var(--border-tactical)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0, 0, 0, 0.4)' }}>
          <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 900, letterSpacing: '0.2em' }}>TACTICAL_ACTIONS</div>
            <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)' }}>EMERGENCY_OVERRIDE_READY</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TacticalCard 
              Icon={Navigation} 
              title="EVACUATION" 
              value={isEmergency ? "PATH_LUMINESCENT" : "STANDBY"} 
              locked={!isEmergency}
              color="var(--neon-orange)"
            />
            
            {/* BIG RED SOS BUTTON */}
            <div 
              onClick={!sosLoading ? handleSOS : null}
              className="sos-button interactive"
              style={{ 
                padding: '1.25rem',
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
                animation: 'pulse-red 2s infinite'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="white" />
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.8)', fontWeight: 900 }}>
                  EMERGENCY_SOS
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', color: 'white', fontWeight: 900, letterSpacing: '0.05em' }}>
                {sosLoading ? ">>> UPLINKING..." : "ACTIVATE_RESCUE"}
              </div>
              <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.6)' }}>READY_FOR_TAP // BROADCAST_TO_HQ</div>
            </div>

            <TacticalCard 
              Icon={LifeBuoy} 
              title="ASSEMBLY" 
              value="ZONE_ALPHA_FRONT" 
              locked={!isEmergency}
              color="var(--neon-green)"
            />
          </div>

          <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.2em' }}>COMMUNICATIONS</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TacticalCard 
              Icon={Mic} 
              title="VOICE_UPLINK" 
              value="OPEN_CHANNEL" 
              color="var(--primary)"
              onClick={handleVoiceReport}
            />
            <TacticalCard 
              Icon={Volume2} 
              title="SITREP_AUDIO" 
              value="NARRATE_BROADCAST" 
              loading={ttsLoading}
              color="var(--primary)"
              onClick={handleTTS}
            />
            <TacticalCard 
              Icon={Accessibility} 
              title="MOBILITY" 
              value={guestProfile?.mobility_assistance_required ? "RESCUE_LOGGED" : "REQUEST_EXTRACTION"} 
              loading={mobilityLoading}
              color="var(--primary)"
              onClick={handleMobilityRequest}
            />
          </div>
        </aside>
      </div>

      <style>{`
        .tactical-card { transition: all 0.2s ease; }
        .tactical-card.interactive:hover { 
          background: rgba(0, 245, 255, 0.08) !important;
          border-color: var(--primary);
          transform: translateX(4px);
        }
        .tactical-card.locked { filter: grayscale(1); }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 1100px) {
          aside { display: none; }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255, 0, 85, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0); }
        }
      `}</style>
    </div>
  );
}
