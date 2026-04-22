import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("AUTHENTICATION_FAILED: INVALID_CREDENTIALS");
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="scan-line" />
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0, 245, 255, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
            <ShieldCheck size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>SYSTEM ACCESS</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>
            RESRTRICTED // AUTHORIZED_STAFF_ONLY
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
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>USER_UPLINK_ID</label>
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
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem', display: 'block' }}>ACCESS_KEY</label>
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
          <button disabled={loading} type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', height: '3rem' }}>
            <Lock size={16} />
            {loading ? "INITIALIZING..." : "EXECUTE_LOGIN"}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
          NO_ACCOUNT? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>REGISTER_UNIT</Link>
        </div>
      </div>
    </div>
  );
}
