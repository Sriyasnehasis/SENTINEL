import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

// Manually stored admin whitelist (never exposed on frontend except for auth check)
const AUTHORIZED_ADMIN_EMAILS = [
  "admin123@gmail.com",
  "sentinel123@gmail.com",
  "sentinel.admin@gmail.com",
  "admin@sentinel.sys"
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestProfile, setGuestProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setGuestProfile(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          // Check both Firestore role AND hardcoded manual whitelist
          const isWhitelisted = AUTHORIZED_ADMIN_EMAILS.includes(currentUser.email?.toLowerCase());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.role === 'admin' || isWhitelisted);
            
            if (userData.role === 'guest' && !isWhitelisted) {
              const guestDoc = await getDoc(doc(db, "guests", currentUser.uid));
              if (guestDoc.exists()) {
                setGuestProfile(guestDoc.data());
              }
            }
          } else {
            setIsAdmin(isWhitelisted);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setGuestProfile(null);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user,
    isAdmin,
    guestProfile,
    signup,
    login,
    logout
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        background: 'var(--bg-void)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'JetBrains Mono'
      }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid var(--border-tactical)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '0.6rem', color: 'var(--primary)', letterSpacing: '0.2em' }}>SYSTEM_INITIALIZING...</div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
