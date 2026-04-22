import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null; // Don't show on login/signup for the orbital feel

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: '1.5rem',
      right: '2rem',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      fontFamily: 'JetBrains Mono',
      fontSize: '0.6rem'
    }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: 'var(--text-muted)' }}>NODE_ACCESS_ID</div>
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{user.email.split('@')[0].toUpperCase()}</div>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="btn" 
        style={{ 
          padding: '0.4rem 0.8rem', 
          fontSize: '0.55rem',
          borderColor: 'rgba(255, 0, 85, 0.3)',
          color: 'var(--accent)'
        }}
      >
        <LogOut size={12} style={{ marginRight: '4px' }} />
        TERMINATE_SESSION
      </button>
    </div>
  );
}
