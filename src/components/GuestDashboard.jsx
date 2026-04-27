import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

function SidebarClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  const hh = pad(time.getHours());
  const mm = pad(time.getMinutes());
  const ss = pad(time.getSeconds());
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' }).toUpperCase();
  return (
    <div style={{
      padding: '0.75rem 0.85rem',
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(0,245,255,0.1)',
      borderRadius: '6px',
      textAlign: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: '1px', background: 'var(--primary)', opacity: 0.4 }} />
      <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', letterSpacing: '0.2em', fontWeight: 800, marginBottom: '4px' }}>LOCAL_TIME</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 900, letterSpacing: '0.08em', color: 'var(--primary)', fontSize: '1.35rem', lineHeight: 1 }}>
        {hh}<span style={{ opacity: 0.5, animation: 'blink 1s step-end infinite' }}>:</span>{mm}<span style={{ fontSize: '0.8rem', opacity: 0.6 }}>:{ss}</span>
      </div>
      <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.15em' }}>{dateStr}</div>
      <style>{`@keyframes blink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.1; } }`}</style>
    </div>
  );
}

export default function GuestDashboard() {
  const { user, logout, guestProfile } = useAuth();
  const [session, setSession] = useState(null);
  const [hasActiveIncidents, setHasActiveIncidents] = useState(false);
  
  const isEmergency = 
    session?.status === "EMERGENCY" ||
    (session?.current_sitrep?.severity === "P0" || session?.current_sitrep?.severity === "P1") ||
    hasActiveIncidents;
  const [sosLoading, setSosLoading] = useState(false);
  const [mobilityLoading, setMobilityLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [rescueStatus, setRescueStatus] = useState(null);

  const room = guestProfile?.room || "Lobby";
  const floor = guestProfile?.floor || "0";
  const userNode = guestProfile?.nodeId || "MT-0-Center";
  const navigate = useNavigate();

  // Redirect if profile is missing (with small grace period for new registrations)
  useEffect(() => {
    let timeout;
    if (guestProfile === false) {
      console.log("PROFILING_REQUIRED: Profile missing. Verifying link...");
      timeout = setTimeout(() => {
        console.log("PROFILING_REQUIRED: Terminating session and redirecting...");
        logout().then(() => {
          navigate("/signup?role=guest");
        });
      }, 2000); // 2s grace period for Firestore propagation
    }
    return () => clearTimeout(timeout);
  }, [guestProfile, navigate, logout]);

  // Listen for Rescue Request Status
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "rescue_requests"),
      where("guest_id", "==", user.uid)
    );
    
    console.log("📡 ATTACHING_RESCUE_LISTENER::", user.uid);
    
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setRescueStatus(null);
        return;
      }

      const activeRequests = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return timeB - timeA;
        });

      setRescueStatus(activeRequests[0]);
    }, (err) => {
      console.error("❌ RESCUE_LISTENER_ERROR:", err);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, "sessions", "current"), (docSnap) => {
      if (docSnap.exists()) {
        setSession(docSnap.data());
      }
    });

    const q = query(collection(db, "incidents"), where("status", "in", ["ACTIVE", "RESCUE"]));
    const unsubInc = onSnapshot(q, (snap) => {
      setHasActiveIncidents(!snap.empty);
    });

    return () => {
      unsubSession();
      unsubInc();
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
        guest_id: user.uid, // Add guest_id for better admin-side sync
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
      // 1. Create Incident Log first (to get incident_id)
      const incidentRef = await addDoc(collection(db, "incidents"), {
        event_type: "TRAPPED", 
        location: { nodeId: userNode, floor: parseInt(floor), zone: room },
        status: "ACTIVE", priority: "P1",
        guest_id: user.uid, // Add guest_id for better admin-side sync
        description: `MOBILITY_ASSISTANCE: Guest ${guestProfile?.fullname || user.email} in Room ${room}`,
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp(),
        source: "GUEST_DASHBOARD"
      });

      // 2. Update guest profile (for state)
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "guests", user.uid), {
        mobility_assistance_required: true,
        extraction_requested_at: new Date().toISOString()
      }, { merge: true });

      // 3. Broadcast to Admin's Rescue Panel
      await addDoc(collection(db, "rescue_requests"), {
        guest_id: user.uid,
        incident_id: incidentRef.id,
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
      
      // Clear the mobility flag so TTS reverts to standard emergency guidance
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "guests", user.uid), {
        mobility_assistance_required: false
      }, { merge: true });

      setRescueStatus(null);
    } catch (e) { console.error(e); }
  };

  const handleTTS = () => {
    // 1. Determine Mode
    let mode = "NOMINAL";
    if (rescueStatus && ["PENDING", "RESOLVED", "ACCEPTED"].includes(rescueStatus.status)) {
      mode = "RESCUE";
    } else if (isEmergency) {
      mode = "EMERGENCY";
    }

    // 2. Localization Map
    const locales = {
      'ENGLISH': {
        NOMINAL: `System nominal. All hospital sectors are currently under standard monitoring. No active emergency protocols detected. Have a safe stay, guest in room ${room}.`,
        EMERGENCY: `Attention. An emergency protocol is active. A luminescent evacuation path has been generated from your location in room ${room}. Please follow the highlighted route to the nearest safe assembly point immediately. Remain calm; SENTINEL is monitoring your status.`,
        RESCUE: `Emergency protocol active. Your rescue request has been received and a tactical team is being deployed to your location in room ${room}. Please follow the luminescent path if safe, or shelter in place. Help is on the way.`,
        MOBILITY: `Priority mobility extraction active. Guest in room ${room}, please remain at your location. A specialized rescue team is en route to assist you. Remain calm.`
      },
      'SPANISH': {
        NOMINAL: `Sistema nominal. Todos los sectores del hospital están bajo monitoreo estándar. No se detectan protocolos de emergencia activos. Tenga una estancia segura, huésped de la habitación ${room}.`,
        EMERGENCY: `Atención. Un protocolo de emergencia está activo. Se ha generado una ruta de evacuación luminiscente desde su ubicación en la habitación ${room}. Por favor, siga la ruta resaltada hacia el punto de reunión seguro más cercano inmediatamente. Mantenga la calma; SENTINEL está monitoreando su estado.`,
        RESCUE: `Protocolo de emergencia activo. Se ha recibido su solicitud de rescate y se está desplegando un equipo táctico a su ubicación en la habitación ${room}. Por favor, siga la ruta luminiscente si es seguro, o permanezca en su lugar. La ayuda está en camino.`,
        MOBILITY: `Extracción de movilidad prioritaria activa. Huésped de la habitación ${room}, por favor permanezca en su ubicación. Un equipo de rescate especializado está en camino para asistirle. Mantenga la calma.`
      },
      'FRENCH': {
        NOMINAL: `Système nominal. Tous les secteurs de l'hôpital sont actuellement sous surveillance standard. Aucun protocole d'urgence actif détecté. Passez un bon séjour, client de la chambre ${room}.`,
        EMERGENCY: `Attention. Un protocole d'urgence est actif. Un chemin d'évacuation luminescent a été généré depuis votre emplacement dans la chambre ${room}. Veuillez suivre immédiatement l'itinéraire mis en évidence vers le point de rassemblement sûr le plus proche. Restez calme ; SENTINEL surveille votre état.`,
        RESCUE: `Protocole d'urgence actif. Votre demande de secours a été reçue et une équipe tactique est en cours de déploiement vers votre emplacement dans la chambre ${room}. Veuillez suivre le chemin luminescent si cela est sûr, ou restez sur place. Les secours sont en route.`,
        MOBILITY: `Extraction de mobilité prioritaire active. Client de la chambre ${room}, veuillez rester à votre emplacement. Une équipe de secours spécialisée est en route pour vous aider. Restez calme.`
      },
      'HINDI': {
        NOMINAL: `सिस्टम सामान्य है। अस्पताल के सभी सेक्टर वर्तमान में मानक निगरानी में हैं। कोई सक्रिय आपातकालीन प्रोटोकॉल नहीं मिला। कमरा नंबर ${room} के अतिथि, आपकी यात्रा सुरक्षित हो।`,
        EMERGENCY: `ध्यान दें। एक आपातकालीन प्रोटोकॉल सक्रिय है। आपके कमरा नंबर ${room} से एक निकासी मार्ग बनाया गया है। कृपया तुरंत निकटतम सुरक्षित असेंबली पॉइंट के लिए हाइलाइट किए गए मार्ग का पालन करें। शांत रहें; सेंटीनेल आपकी स्थिति की निगरानी कर रहा है।`,
        RESCUE: `आपातकालीन प्रोटोकॉल सक्रिय है। आपका बचाव अनुरोध प्राप्त हो गया है और एक सामरिक टीम आपके कमरा नंबर ${room} पर भेजी जा रही है। यदि सुरक्षित हो तो चमकदार पथ का पालन करें, या वहीं रुकें। मदद रास्ते में है।`,
        MOBILITY: `प्राथमिकता गतिशीलता निष्कर्षण सक्रिय है। कमरा नंबर ${room} के अतिथि, कृपया अपने स्थान पर बने रहें। आपकी सहायता के लिए एक विशेष बचाव दल आ रहा है। शांत रहें।`
      }
    };

    const userLang = guestProfile?.language || 'ENGLISH';
    const langSet = locales[userLang] || locales['ENGLISH'];
    
    let text = session?.current_sitrep?.narrative;
    
    // Fallback to localized templates if narrative is missing or generic
    if (!text || text.toLowerCase().includes("system nominal") && mode !== "NOMINAL") {
      if (guestProfile?.mobility_assistance_required && mode !== "NOMINAL") {
        text = langSet.MOBILITY;
      } else {
        text = langSet[mode];
      }
    }

    const langMap = {
      'ENGLISH': 'en-US',
      'SPANISH': 'es-ES',
      'FRENCH': 'fr-FR',
      'HINDI': 'hi-IN'
    };
    const lang = langMap[userLang] || 'en-US';
    
    setTtsLoading(true);
    speakTactical(text, lang, mode, () => setTtsLoading(false));
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
        <aside className="sidebar animate-in" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10, overflowY: 'auto' }}>
          
          {/* ─── Section: Guest ID ─────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(0,245,255,0.02) 100%)',
            border: '1px solid rgba(0,245,255,0.2)',
            borderRadius: '6px',
            padding: '1rem 1rem 1rem 1.25rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--primary)', borderRadius: '6px 0 0 6px' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '30px', height: '30px', borderRight: '1px solid rgba(0,245,255,0.2)', borderTop: '1px solid rgba(0,245,255,0.2)', borderRadius: '0 6px 0 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={20} color="var(--primary)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guestProfile?.fullname?.toUpperCase() || 'ANON_USER'}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.15em', marginTop: '2px' }}>
                  GUEST_PROFILE
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'ROOM', value: room },
                { label: 'FLOOR', value: `FL-${floor}` },
                { label: 'LANG', value: guestProfile?.language || 'ENG' },
                { label: 'NODE', value: userNode?.split('-').slice(0,2).join('-') || 'N/A' }
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: '4px',
                  padding: '0.5rem 0.65rem',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '3px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Section: System Status ────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.2em', paddingLeft: '2px' }}>// SYSTEM_STATUS</div>
            
            {/* Main alert state */}
            <div style={{
              padding: '1rem 1.1rem',
              borderRadius: '6px',
              background: isEmergency ? 'rgba(255,0,85,0.08)' : 'rgba(0,255,159,0.05)',
              border: `1px solid ${isEmergency ? 'rgba(255,0,85,0.3)' : 'rgba(0,255,159,0.2)'}`,
              borderLeft: `3px solid ${isEmergency ? 'var(--accent)' : 'var(--neon-green)'}`,
              display: 'flex', alignItems: 'center', gap: '0.85rem',
              animation: isEmergency ? 'pulse-red 2s infinite' : 'none'
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: isEmergency ? 'var(--accent)' : 'var(--neon-green)',
                boxShadow: `0 0 10px ${isEmergency ? 'var(--accent)' : 'var(--neon-green)'}`,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: isEmergency ? 'var(--accent)' : 'var(--neon-green)', letterSpacing: '0.05em' }}>
                  {isEmergency ? 'CRITICAL_ALERT' : 'ALL_CLEAR'}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {isEmergency ? 'EMERGENCY_PROTOCOLS_ACTIVE' : 'NOMINAL_MONITORING'}
                </div>
              </div>
            </div>

            {/* Security mode */}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} color={isEmergency ? 'var(--accent)' : 'var(--primary)'} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>SECURITY_MODE</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: isEmergency ? 'var(--accent)' : 'var(--primary)', fontWeight: 900 }}>
                {isEmergency ? 'LOCKDOWN' : 'STANDARD'}
              </span>
            </div>
          </div>

          {/* ─── Section: Rescue Status ────────────────────────────── */}
          {rescueStatus && (
            <div style={{
              padding: '0.9rem 1rem',
              borderRadius: '6px',
              background: rescueStatus.status === 'RESOLVED' ? 'rgba(0,255,159,0.06)' : 'rgba(0,245,255,0.06)',
              border: `1px solid ${rescueStatus.status === 'RESOLVED' ? 'rgba(0,255,159,0.3)' : 'rgba(0,245,255,0.25)'}`,
              borderLeft: `3px solid ${rescueStatus.status === 'RESOLVED' ? 'var(--neon-green)' : 'var(--primary)'}`
            }}>
              <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '0.5rem' }}>// RESCUE_REQUEST</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Accessibility size={16} color={rescueStatus.status === 'RESOLVED' ? 'var(--neon-green)' : 'var(--primary)'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: rescueStatus.status === 'RESOLVED' ? 'var(--neon-green)' : 'var(--primary)' }}>
                  {rescueStatus.status === 'RESOLVED' ? 'TEAM_DEPLOYED' : 'REQUEST_ACTIVE'}
                </span>
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                STATUS :: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{rescueStatus.status}</span>
              </div>
            </div>
          )}

          {/* ─── Section: Location Signal ──────────────────────────── */}
          <div style={{
            padding: '0.9rem 1rem',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-dim)',
            display: 'flex', flexDirection: 'column', gap: '0.6rem'
          }}>
            <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.15em' }}>// LOCATION_BEACON</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userNode || 'MT-G-Lobby'}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  FLOOR {floor} · ROOM {room}
                </div>
              </div>
            </div>
            {/* Signal bars */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
              {[5, 8, 11, 14, 17].map((h, i) => (
                <div key={i} style={{
                  width: '7px', height: `${h}px`, borderRadius: '2px',
                  background: i < 4 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  opacity: i < 4 ? 1 : 0.3
                }} />
              ))}
              <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 800, marginLeft: '6px', letterSpacing: '0.1em' }}>STRONG</span>
            </div>
          </div>

          {/* ─── Section: Live Clock & Uplink ──────────────────────── */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SidebarClock />
            
            <div style={{
              padding: '0.65rem 1rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: '4px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.12em' }}>UPLINK_ENCRYPTION</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.05em' }}>AES-256</span>
            </div>
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
              value={rescueStatus && ["PENDING", "RESOLVED", "ACCEPTED"].includes(rescueStatus.status) ? "RESCUE_LOGGED" : "REQUEST_EXTRACTION"}
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
