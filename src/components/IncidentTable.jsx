import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { 
  AlertTriangle, Flame, Wind, UserX, Activity, MapPin, 
  Trash2, Filter, Edit2, ChevronDown, Zap, Users, Shield
} from 'lucide-react';

const STATUS_META = {
  ACTIVE:       { color: "#ff0055", label: "CRITICAL" },
  INVESTIGATING:{ color: "#ffffff", label: "DISPATCHED" },
  RESOLVED:     { color: "#00ff9f", label: "SECURE" },
};

const EVENT_META = {
  FIRE:    { color: "#ff0055", bg: "rgba(255,0,85,0.1)",   label: "FIRE",    icon: Flame },
  SMOKE:   { color: "#ff9f00", bg: "rgba(255,159,0,0.1)",  label: "SMOKE",   icon: Wind },
  TRAPPED: { color: "#00f5ff", bg: "rgba(0,245,255,0.1)",  label: "TRAPPED", icon: UserX },
  MEDICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.1)",  label: "MEDICAL", icon: Activity },
  SOS_SIGNAL: { color: "#ff0055", bg: "rgba(255,0,85,0.2)", label: "SOS_BROADCAST", icon: AlertTriangle },
};

const TYPE_PRIORITY_BONUS = {
  FIRE:    60,
  SMOKE:   40,
  TRAPPED: 50,
  MEDICAL: 30,
  PANIC:   15,
  SOS_SIGNAL: 150,
};

const calculatePriority = (inc) => {
  const type = TYPE_PRIORITY_BONUS[inc.event_type] || 0;
  const nodes = (inc.affected_nodes?.length || 0) * 15;
  const confidence = (inc.confidence || 1) * 20;
  return Math.floor(type + nodes + confidence);
};

export default function IncidentTable({ onFocus }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [eventMenuId, setEventMenuId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = [...raw].sort((a, b) => {
        if (a.status !== b.status) {
          const statusOrder = { ACTIVE: 0, INVESTIGATING: 1, RESOLVED: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // Strict priority weight within the same status group
        return calculatePriority(b) - calculatePriority(a);
      });
      setIncidents(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateDocField = async (id, field, value) => {
    try {
      await updateDoc(doc(db, "incidents", id), { [field]: value, updated_at: serverTimestamp() });
      setStatusMenuId(null);
      setEventMenuId(null);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="loader"></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div className="hud-label"><Filter size={12} /> TACTICAL_STREAM_V5.0</div>

      {incidents.map((inc, index) => {
        const meta = EVENT_META[inc.event_type] || EVENT_META.FIRE;
        const currentStatus = STATUS_META[inc.status] || STATUS_META.ACTIVE;
        const isStatusMenuOpen = statusMenuId === inc.id;
        const isEventMenuOpen = eventMenuId === inc.id;
        const isExpanded = expandedId === inc.id;
        const openUpwards = index > 3; 

        return (
          <div 
            key={inc.id} 
            className={`glass-card animate-in ${isExpanded ? 'active-row' : ''}`}
            style={{ 
              padding: '0', 
              borderLeft: `4px solid ${currentStatus.color}`, 
              position: 'relative',
              overflow: 'visible',
              zIndex: (isStatusMenuOpen || isEventMenuOpen) ? 1000 : 1,
              background: isExpanded ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.3)',
              transition: 'all 0.3s ease'
            }} 
          >
            <div style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => { setExpandedId(isExpanded ? null : inc.id); onFocus && onFocus(inc); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'} // L-{inc.location?.floor}
                    </span>

                    {/* EVENT PENCIL: Changes the Type (Fire/Smoke/etc) */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); setEventMenuId(isEventMenuOpen ? null : inc.id); }}
                      style={{ 
                        color: meta.color, fontSize: '0.8rem', fontWeight: 900, 
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                        padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px'
                      }}
                    >
                      {meta.label} <Edit2 size={10} style={{ opacity: 0.8 }} />
                    </div>

                    {/* EVENT TYPE DROPDOWN */}
                    {isEventMenuOpen && (
                      <div style={{
                        position: 'absolute', top: '2.5rem', left: '1rem', zIndex: 10001,
                        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
                        padding: '4px', minWidth: '130px', backdropFilter: 'blur(20px)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.9)', borderRadius: '4px'
                      }}>
                        {Object.keys(EVENT_META).map(type => (
                          <div 
                            key={type} 
                            onClick={(e) => { e.stopPropagation(); updateDocField(inc.id, 'event_type', type); }}
                            style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: 900, color: EVENT_META[type].color, cursor: 'pointer' }}
                          >
                            {EVENT_META[type].label}
                          </div>
                        ))}
                      </div>
                    )}

                    {inc.source === 'VOICE_BRIDGE' && <span style={{ fontSize: '0.55rem', color: '#00ff9f', fontWeight: 800, background: 'rgba(0,255,159,0.1)', padding: '1px 4px' }}>VERIFIED</span>}
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600, opacity: isExpanded ? 1 : 0.8 }}>
                    {inc.description}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: '4px' }}>P_SCORE::{inc.event_type === 'SOS_SIGNAL' ? 1850 : 1840}</div>
                  
                  {/* STATUS LABEL: Changes the Status (Critical/Dispatched/Secure) */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); setStatusMenuId(isStatusMenuOpen ? null : inc.id); }}
                    style={{ 
                      color: currentStatus.color, fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {currentStatus.label} <ChevronDown size={10} />
                  </div>
                  
                  {/* STATUS DROPDOWN */}
                  {isStatusMenuOpen && (
                    <div style={{
                      position: 'absolute', 
                      [openUpwards ? 'bottom' : 'top']: 'calc(0% + 25px)', 
                      right: '0', 
                      zIndex: 10000,
                      background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
                      padding: '4px', minWidth: '145px', backdropFilter: 'blur(20px)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.9)', borderRadius: '4px'
                    }}>
                      {Object.entries(STATUS_META).map(([key, m]) => (
                        <div 
                          key={key} 
                          onClick={(e) => { e.stopPropagation(); updateDocField(inc.id, 'status', key); }}
                          style={{ 
                            padding: '10px 14px', fontSize: '0.75rem', fontWeight: 900, color: m.color, 
                            cursor: 'pointer', textAlign: 'left', borderRadius: '2px', display: 'flex', 
                            alignItems: 'center', justifyContent: 'space-between',
                            background: inc.status === key ? 'rgba(255,255,255,0.06)' : 'transparent'
                          }}
                        >
                          {m.label}
                          {inc.status === key && <div style={{ width: '5px', height: '5px', background: m.color, borderRadius: '50%' }} />}
                        </div>
                      ))}
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                      <div onClick={(e) => { e.stopPropagation(); setStatusMenuId(null); }} style={{ padding: '8px 14px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', textAlign: 'center' }}>CANCEL_ACTION</div>
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, "incidents", inc.id)); }}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
                  <div className="tactical-stat">
                    <div className="stat-label">FLOOR_LOCATION</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>LEVEL_{inc.location?.floor || 'G'}</div>
                  </div>
                  <div className="tactical-stat">
                    <div className="stat-label">SECTOR_ZONE</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>{inc.location?.nodeId || 'UNKNOWN'}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '1px' }}>// RECOMMENDED_PROCEDURES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', color: 'white' }}>
                      <Zap size={10} color="var(--accent)" /> 01_ DEPLOY EMERGENCY RESPONSE TEAM
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', color: 'white' }}>
                      <Users size={10} color="var(--accent)" /> 02_ CLEAR NON-ESSENTIAL STAFF FROM SECTOR
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', color: 'white' }}>
                      <Shield size={10} color="var(--accent)" /> 03_ INITIATE AUDIO ANNOUNCEMENT
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
