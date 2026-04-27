import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { User, MapPin, CheckCircle, Clock, Accessibility } from 'lucide-react';

export default function RescueRequestPanel() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "rescue_requests"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resolveRequest = async (id, guest_id) => {
    try {
      await updateDoc(doc(db, "rescue_requests", id), {
        status: "RESOLVED",
        resolved_at: new Date().toISOString()
      });
      if (guest_id) {
        await updateDoc(doc(db, "guests", guest_id), {
          mobility_assistance_required: false
        });
      }
    } catch (err) {
      console.error("Error resolving request:", err);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "PENDING");

  if (pendingRequests.length === 0) return null;

  return (
    <div className="animate-in" style={{ marginTop: '1.5rem' }}>
      <div className="hud-label" style={{ borderLeftColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '1rem' }}>
        PENDING_RESCUE_REQUESTS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pendingRequests.map(req => (
          <div key={req.id} className="glass-card" style={{ padding: '0.75rem', borderLeft: '2px solid var(--accent)', background: 'rgba(255, 0, 85, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                <User size={14} color="var(--accent)" />
                {req.fullname?.toUpperCase() || 'ANON_USER'} // RM {req.room}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                <Clock size={10} style={{ marginRight: '4px' }} />
                {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleTimeString() : 'RECENT'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '2px' }}>
                <MapPin size={10} /> FLOOR {req.floor}
              </div>
              {req.mobility_impaired && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--accent)', background: 'rgba(255,0,85,0.1)', padding: '2px 6px', borderRadius: '2px', fontWeight: 800 }}>
                  <Accessibility size={10} /> MOBILITY_AID_NEEDED
                </div>
              )}
            </div>

            <button 
              onClick={() => resolveRequest(req.id, req.guest_id)}
              className="btn" 
              style={{ width: '100%', fontSize: '0.6rem', padding: '0.4rem', background: 'var(--accent)', color: 'black' }}
            >
              MARK_AS_RESCUED
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
