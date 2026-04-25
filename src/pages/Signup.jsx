import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Cpu, AlertCircle, ChevronLeft, ShieldCheck } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const requestedRole = query.get('role') || 'guest';
  const isAdm = requestedRole === 'admin';
  const themeColor = isAdm ? 'var(--primary)' : 'var(--neon-green)';

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [room, setRoom] = useState("");
  const [floor, setFloor] = useState("1");
  const [language, setLanguage] = useState("en");
  const [mobility, setMobility] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ja', name: 'Japanese' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' }
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("ERROR: PASSWORDS_DO_NOT_MATCH");
    }

    try {
      setError("");
      setLoading(true);
      const { user } = await signup(email, password);
      
      // 1. Save Core User Document
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        fullname: fullname,
        role: isAdm ? 'admin' : 'guest',
        created_at: new Date().toISOString()
      });
      
      // 2. Save Guest Profile (only if not admin)
      if (!isAdm) {
        await setDoc(doc(db, "guests", user.uid), {
          fullname,
          room,
          floor: parseInt(floor),
          language,
          mobility_impaired: mobility,
          email: user.email,
          created_at: new Date().toISOString()
        });
      }

      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("CONFLICT: EMAIL_ALREADY_PROVISIONED. PLEASE_LOGIN.");
      } else if (err.code === 'auth/weak-password') {
        setError("SECURITY_BREACH: PASSWORD_TOO_WEAK.");
      } else {
        setError("REGISTRATION_ERROR: UPLINK_FAILED");
      }
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-void)',
      padding: '2rem'
    }}>
      <div className="scan-line" />
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', borderTop: `4px solid ${themeColor}` }}>
        
        <button 
          onClick={() => navigate(`/login?role=${requestedRole}`)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', marginBottom: '1.5rem', fontFamily: 'JetBrains Mono' }}
        >
          <ChevronLeft size={12} /> BACK_TO_LOGIN
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: `${themeColor}15`, padding: '1rem', borderRadius: '4px', border: `1px solid ${themeColor}`, marginBottom: '1.5rem', color: themeColor }}>
            {isAdm ? <ShieldCheck size={32} /> : <Cpu size={32} />}
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white', letterSpacing: '0.1em' }}>
            {isAdm ? 'ADMIN_UPLINK_PROVISIONING' : 'GUEST_REGISTRATION'}
          </h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {isAdm ? 'ESTABLISHING_COMMAND_CREDENTIALS' : 'INITIALIZING_NEW_RESIDENT_UPLINK'}
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
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>FULL_NAME</label>
            <input type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} required placeholder="John Doe" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
          </div>
          <div className="input-group">
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>EMAIL_ADDRESS</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="staff@sentinel.sys" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
          </div>
          
          {!isAdm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>ROOM_NO</label>
                <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} required placeholder="412" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>FLOOR</label>
                <select 
                  key="floor-select-v2"
                  value={floor} 
                  onChange={(e) => setFloor(e.target.value)} 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}
                >
                  <option value="1">FLOOR 1</option>
                  <option value="2">FLOOR 2</option>
                  <option value="3">FLOOR 3</option>
                  <option value="4">FLOOR 4</option>
                  <option value="5">FLOOR 5</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>CONFIRM_PASS</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }} />
            </div>
          </div>

          {!isAdm && (
            <>
              <div className="input-group">
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.3rem', display: 'block' }}>PREF_LANGUAGE</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-tactical)', padding: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                  {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                <input type="checkbox" checked={mobility} onChange={(e) => setMobility(e.target.checked)} id="mobility" style={{ accentColor: 'var(--neon-green)', width: '16px', height: '16px' }} />
                <label htmlFor="mobility" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', cursor: 'pointer' }}>MOBILITY_ASSISTANCE_REQUIRED</label>
              </div>
            </>
          )}

          <button disabled={loading} type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', height: '3.5rem', borderColor: themeColor }}>
            {isAdm ? <ShieldCheck size={16} /> : <UserPlus size={16} />}
            {loading ? "INITIALIZING..." : (isAdm ? "ESTABLISH_ADMIN_UPLINK" : "FINALIZE_UPLINK")}
          </button>
        </form>
      </div>
    </div>
  );
}
