import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, ShieldCheck, AlertCircle, User, ChevronLeft } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const requestedRole = query.get('role') || 'guest'; // 'admin' or 'guest'
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const isAdm = requestedRole === 'admin';
  const themeColor = isAdm ? 'var(--primary)' : 'var(--neon-green)';

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("AUTHENTICATION_FAILED: INVALID_CREDENTIALS");
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
      background: 'var(--bg-void)' 
    }}>
      <div className="scan-line" />
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderTop: `4px solid ${themeColor}` }}>
        
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', marginBottom: '1.5rem', fontFamily: 'JetBrains Mono' }}
        >
          <ChevronLeft size={12} /> BACK_TO_ROLES
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: `${themeColor}15`, 
            padding: '1rem', 
            borderRadius: '4px', 
            border: `1px solid ${themeColor}`, 
            marginBottom: '1.5rem',
            color: themeColor
          }}>
            {isAdm ? <ShieldCheck size={32} /> : <User size={32} />}
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white', letterSpacing: '0.1em' }}>
            {isAdm ? 'ADMIN_UPLINK' : 'GUEST_ACCESS'}
          </h2>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {isAdm ? 'AUTHORIZED_COMMAND_PERSONNEL_ONLY' : 'RESIDENT_SECURITY_INTERFACE'}
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
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>UPLINK_ID</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder={isAdm ? "staff.node@sentinel.sys" : "resident@sentinel.sys"}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-tactical)',
                padding: '0.8rem',
                color: 'white',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.8rem'
              }}
            />
          </div>
          <div className="input-group">
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>ACCESS_KEY</label>
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
                fontSize: '0.8rem'
              }}
            />
          </div>
          <button disabled={loading} type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', height: '3.5rem', borderColor: themeColor }}>
            <Lock size={16} />
            {loading ? "INITIALIZING..." : "EXECUTE_LOGIN"}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
          NO_ACCOUNT? <Link to={`/signup?role=${requestedRole}`} style={{ color: themeColor, fontWeight: '700', textDecoration: 'underline' }}>REGISTER_UNIT</Link>
        </div>
      </div>
    </div>
  );
}
