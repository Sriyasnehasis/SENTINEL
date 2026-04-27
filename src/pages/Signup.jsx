import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Cpu, AlertCircle } from "lucide-react";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [wing, setWing] = useState("MT");
  const [floor, setFloor] = useState("0");
  const [room, setRoom] = useState("");
  const [language, setLanguage] = useState("ENGLISH");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const BUILDING_STRUCTURE = {
    MT:  { name: "Main Tower", floors: ["0", "1", "2", "3", "4"], zones: ["East Hall", "West Hall", "Center"] },
    ER:  { name: "ER Wing",    floors: ["0", "1", "2"],        zones: ["Admissions", "Surgical Hub", "Waiting"] },
    ICU: { name: "ICU Wing",   floors: ["0", "1", "2", "3"],   zones: ["Central", "Recovery"] },
    OPD: { name: "OPD Wing",   floors: ["0", "1", "2"],        zones: ["Pharmacy", "Clinics"] },
  };
  const { signup, login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    if (password.length < 6) {
      setError("SECURITY_ERROR: PASSWORD_TOO_WEAK (MIN 6 CHARS)");
      return;
    }

    try {
      setLoading(true);
      let userCredential;

      try {
        userCredential = await signup(email, password);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          try {
            userCredential = await login(email, password);
          } catch (loginErr) {
            setError("AUTH_ERROR: INVALID_KEY_FOR_EXISTING_ID");
            setLoading(false);
            return;
          }
        } else {
          throw authErr;
        }
      }
      
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      
      if (role === 'guest' || !role) {
        const nodeId = `${wing}-${floor}-${room.replace(/\s+/g, '')}`;
        
        await setDoc(doc(db, "guests", userCredential.user.uid), {
          email: email,
          fullname: fullname || email.split('@')[0],
          wing: wing,
          floor: floor,
          room: room,
          nodeId: nodeId,
          language: language,
          mobility_assistance_required: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        }, { merge: true });
      }
      
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
        setError("REGISTRATION_ERROR: INVALID_ID_FORMAT");
      } else {
        setError("REGISTRATION_ERROR: UPLINK_FAILED");
      }
    }
    setLoading(false);
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="scan-line" />
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0, 245, 255, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
            <Cpu size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>UNIT REGISTRATION</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>
            INITIALIZING_NEW_OPERATOR_UPLINK
          </p>
        </div>
        
        {error && (
          <div style={{ 
            background: 'rgba(255, 0, 85, 0.05)', 
            border: '1px solid var(--accent)', 
            color: 'var(--accent)', 
            padding: '0.75rem', 
            borderRadius: '4px', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            fontSize: '0.7rem',
            fontFamily: 'JetBrains Mono'
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>OPERATOR_NAME</label>
            <input 
              type="text" 
              value={fullname} 
              onChange={(e) => setFullname(e.target.value)} 
              required 
              placeholder="JOHN_DOE" 
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-tactical)',
                padding: '0.8rem',
                color: 'white',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div className="input-group">
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>ASSIGN_UPLINK_ID (EMAIL)</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="operator@sentinel.sys" 
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-tactical)',
                padding: '0.8rem',
                color: 'white',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div className="input-group">
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>NEW_ACCESS_KEY (PASSWORD)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-tactical)',
                padding: '0.8rem',
                color: 'white',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>BUILDING_WING</label>
              <select 
                value={wing} 
                onChange={(e) => { setWing(e.target.value); setFloor(BUILDING_STRUCTURE[e.target.value].floors[0]); setRoom(""); }} 
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-tactical)',
                  padding: '0.8rem',
                  color: 'white',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.85rem'
                }}
              >
                {Object.keys(BUILDING_STRUCTURE).map(w => (
                  <option key={w} value={w}>{BUILDING_STRUCTURE[w].name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>FLOOR</label>
                <select 
                  value={floor} 
                  onChange={(e) => setFloor(e.target.value)} 
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-tactical)',
                    padding: '0.8rem',
                    color: 'white',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.85rem'
                  }}
                >
                  {BUILDING_STRUCTURE[wing].floors.map(f => (
                    <option key={f} value={f}>LEVEL_{f}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ flex: 2 }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>SPECIFIC_ZONE</label>
                <select 
                  value={room} 
                  onChange={(e) => setRoom(e.target.value)} 
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-tactical)',
                    padding: '0.8rem',
                    color: 'white',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="" disabled>SELECT_ZONE</option>
                  {BUILDING_STRUCTURE[wing].zones.map(z => (
                    <option key={z} value={z}>{z.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>PREFERED_LANGUAGE</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-tactical)',
                  padding: '0.8rem',
                  color: 'white',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ENGLISH">ENGLISH</option>
                <option value="SPANISH">SPANISH</option>
                <option value="FRENCH">FRENCH</option>
                <option value="HINDI">HINDI</option>
              </select>
            </div>
          </div>
          <button disabled={loading} type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', height: '3rem' }}>
            <UserPlus size={16} />
            {loading ? "PROCESSING..." : "REGISTER_UNIT"}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
          ALREADY_ASSIGNED? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>SYSTEM_ACCESS</Link>
        </div>
      </div>
    </div>
  );
}
