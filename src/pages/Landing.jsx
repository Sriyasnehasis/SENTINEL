import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const RoleCard = ({ title, desc, icon: Icon, color, onClick }) => (
    <div 
      onClick={onClick}
      className="glass-card animate-in" 
      style={{ 
        flex: 1, 
        padding: '3rem', 
        textAlign: 'center', 
        cursor: 'pointer',
        border: '1px solid var(--border-tactical)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'rgba(15, 23, 42, 0.3)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.background = `${color}05`;
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = `0 10px 40px ${color}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-tactical)';
        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ 
        background: `${color}15`, 
        padding: '1.5rem', 
        borderRadius: '50%', 
        color: color,
        boxShadow: `0 0 20px ${color}20`
      }}>
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.75rem', letterSpacing: '0.2em', fontWeight: 800 }}>{title}</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', lineHeight: 1.6, maxWidth: '240px' }}>{desc}</p>
      </div>
      <div style={{ 
        marginTop: '1rem', 
        fontSize: '0.6rem', 
        color: color, 
        fontFamily: 'JetBrains Mono', 
        letterSpacing: '0.1em',
        borderBottom: `1px solid ${color}`,
        paddingBottom: '2px'
      }}>
        INITIALIZE_UPLINK
      </div>
    </div>
  );

  return (
    <div className="container" style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
    }}>
      <div className="scan-line" />
      
      <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <div className="hud-label" style={{ marginBottom: '1rem', letterSpacing: '0.5em' }}>SENTINEL_EMERGENCY_NETWORK</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.4em', color: 'white' }}>CORE ACCESS</h1>
      </div>

      <div style={{ display: 'flex', gap: '3rem', width: '100%', maxWidth: '900px', padding: '0 2rem' }}>
        <RoleCard 
          title="ADMIN"
          desc="Tactical Command & Campus Oversight. Authorized personnel only."
          icon={Shield}
          color="var(--primary)"
          onClick={() => navigate('/login?role=admin')}
        />
        <RoleCard 
          title="GUEST"
          desc="Personalized Safety & Wayfinding. Resident and guest access."
          icon={User}
          color="var(--neon-green)"
          onClick={() => navigate('/login?role=guest')}
        />
      </div>

      <div style={{ 
        position: 'fixed', 
        bottom: '3rem', 
        fontFamily: 'JetBrains Mono', 
        fontSize: '0.6rem', 
        color: 'var(--text-muted)',
        letterSpacing: '0.1em'
      }}>
        v3.5 // SECURE_UPLINK_STABLE // GSC_2026
      </div>
    </div>
  );
}
