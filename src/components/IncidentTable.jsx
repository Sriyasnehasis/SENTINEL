import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit, updateDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { 
  Flame, Wind, UserX, Activity, Clock, MapPin, 
  AlertTriangle, Plus, X, Search, Edit2, Trash2,
  CloudFog, ShieldAlert
} from "lucide-react";
import { hospitalData } from "../utils/buildingGraph";

const EVENT_META = {
  FIRE: { color: "var(--accent)", bg: "rgba(255,0,85,0.15)", label: "FIRE", icon: Flame },
  SMOKE: { color: "var(--neon-orange)", bg: "rgba(255,159,0,0.15)", label: "SMOKE", icon: CloudFog },
  TRAPPED: { color: "var(--primary)", bg: "rgba(0,245,255,0.15)", label: "TRAPPED", icon: UserX },
  MEDICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.15)", label: "MEDICAL", icon: Activity },
  INJURY: { color: "var(--neon-orange)", bg: "rgba(245,158,11,0.15)", label: "INJURY", icon: ShieldAlert },
  PANIC: { color: "#ec4899", bg: "rgba(236,72,153,0.15)", label: "PANIC", icon: AlertTriangle },
  MASS_CASUALTY: { color: "#ff0000", bg: "rgba(255,0,0,0.25)", label: "MCI", icon: AlertTriangle },
  SOS_SIGNAL: { color: "var(--accent)", bg: "rgba(255,0,85,0.25)", label: "SOS_SIGNAL", icon: AlertTriangle },
};

const TYPE_PRIORITY_BONUS = {
  FIRE: 60,
  MEDICAL: 50,
  SMOKE: 40,
  TRAPPED: 35,
  INJURY: 25,
  PANIC: 15,
  MASS_CASUALTY: 100,
  SOS_SIGNAL: 200,
};

const STATUS_BASE_SCORE = {
  ACTIVE: 1000,
  RESCUE: 800,
  INVESTIGATING: 100,
  RESOLVED: 0,
};

function calculatePriority(inc) {
  const base = STATUS_BASE_SCORE[inc.status] ?? 0;
  const type = TYPE_PRIORITY_BONUS[inc.event_type] ?? 0;
  const spread = (inc.affected_nodes?.length ?? 0) * 20;
  const ageMs = inc.timestamp ? Date.now() - new Date(inc.timestamp) : 0;
  // Age bonus: unresolved older incidents rise slightly (prevents "forgotten" incidents)
  // 0.5 points per minute, capped at 15 points (30 mins)
  const ageFactor = (inc.status === 'ACTIVE' || inc.status === 'RESCUE') ? Math.min(ageMs / 120000, 15) : 0;
  return base + type + spread + ageFactor;
}

const STATUS_META = {
  ACTIVE: { color: "var(--accent)", label: "CRITICAL" },
  RESCUE: { color: "var(--primary)", label: "RESCUE_IN_PROG" },
  INVESTIGATING: { color: "var(--neon-orange)", label: "DISPATCHED" },
  RESOLVED: { color: "var(--neon-green)", label: "SECURE" },
};


function LocationManager({ incident, onUpdate, onClose }) {
  const [search, setSearch] = useState("");
  const allNodes = Object.entries(hospitalData.nodes);
  const filtered = allNodes.filter(([id, data]) =>
    id.toLowerCase().includes(search.toLowerCase()) ||
    data.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  const affected = incident.affected_nodes || [];

  const toggleNode = (nodeId) => {
    if (incident.location?.nodeId === nodeId) return; // Can't remove primary this way
    const newAffected = affected.includes(nodeId)
      ? affected.filter(id => id !== nodeId)
      : [...affected, nodeId];
    onUpdate({ affected_nodes: newAffected });
  };

  const setPrimary = (nodeId) => {
    const nodeData = hospitalData.nodes[nodeId];
    onUpdate({
      location: {
        nodeId,
        floor: nodeData.floor,
        zone: nodeData.name, // or a normalized zone name
        room: ""
      }
    });
  };

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, width: "240px",
      background: "var(--bg-panel)", border: "1px solid var(--border-dim)",
      zIndex: 200, padding: "1rem", boxShadow: "var(--shadow-heavy)",
      fontFamily: "JetBrains Mono", borderRadius: "4px"
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--primary)" }}>AREA_MANAGER</span>
        <X size={14} style={{ cursor: "pointer" }} onClick={onClose} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "4px" }}>PRIMARY_ORIGIN</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-main)", background: "rgba(255,255,255,0.05)", padding: "4px 8px" }}>
          {incident.location?.nodeId || "NOT_SET"}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "4px" }}>ESCALATED_ZONES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {affected.map(id => (
            <span key={id} style={{
              fontSize: "0.5rem", background: "var(--accent)22",
              color: "var(--accent)", padding: "2px 6px", borderRadius: "2px",
              display: "flex", alignItems: "center", gap: "4px"
            }}>
              {id} <X size={8} style={{ cursor: "pointer" }} onClick={() => toggleNode(id)} />
            </span>
          ))}
          {affected.length === 0 && <span style={{ fontSize: "0.5rem", color: "var(--text-dim)" }}>STATIONARY</span>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
        <div style={{ position: "relative", marginBottom: "0.5rem" }}>
          <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH ARCHITECTURE..."
            style={{
              width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-dim)",
              color: "var(--text-main)", fontSize: "0.6rem", padding: "6px 6px 6px 24px",
              outline: "none"
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "150px", overflowY: "auto" }}>
          {filtered.map(([id, data]) => (
            <div key={id} style={{
              fontSize: "0.55rem", padding: "6px", background: "rgba(255,255,255,0.02)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "var(--text-main)" }}>{id}</span>
                <span style={{ fontSize: "0.45rem", color: "var(--text-dim)" }}>{data.name}</span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => setPrimary(id)} style={{ fontSize: "0.45rem", background: "var(--primary)44", border: "none", color: "var(--primary)", padding: "2px 4px", cursor: "pointer" }}>ORIGIN</button>
                <button onClick={() => toggleNode(id)} style={{ fontSize: "0.45rem", background: "var(--accent)44", border: "none", color: "var(--accent)", padding: "2px 4px", cursor: "pointer" }}>
                  {affected.includes(id) ? "REMOVE" : "ADD"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IncidentTable({ focusedIncidentId, onFocus }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'status', 'type', 'location'

  const handleUpdate = async (id, data) => {
    try {
      const docRef = doc(db, "incidents", id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
      setEditingId(null);
      setEditingField(null);
    } catch (err) {
      console.error("Failed to update incident:", err);
      alert("Update failed. Check console.");
    }
  };

  const handleStatusChange = (id, newStatus) => handleUpdate(id, { status: newStatus });

  const handleDelete = async (id) => {
    const confirmed = window.confirm("⚠ PERMANENTLY REMOVE INCIDENT FROM LOG?");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "incidents", id));
    } catch (err) {
      console.error("Failed to delete incident:", err);
      alert("Delete failed.");
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIncidents([...raw].sort((a, b) => calculatePriority(b) - calculatePriority(a)));
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
        SYNCING_STREAM...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {incidents.map((inc, idx) => {
        const meta = EVENT_META[inc.event_type] || {
          color: "var(--text-muted)", label: inc.event_type, icon: AlertTriangle
        };
        const statusMeta = STATUS_META[inc.status] || { color: "var(--text-muted)", label: inc.status };
        const timeStr = inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : "--:--";
        const isStale = inc.status === 'ACTIVE' && inc.timestamp && (Date.now() - new Date(inc.timestamp)) > 30 * 60 * 1000;
        const dimmed = inc.status === 'RESOLVED';
        const isSpreading = inc.status === 'ACTIVE' && (inc.affected_nodes?.length ?? 0) >= 2;
        const priority = calculatePriority(inc);
        const Icon = meta.icon;

        return (
          <div
            key={inc.id}
            onClick={() => {
              if (onFocus) onFocus(inc);
              if (inc.location?.nodeId) {
                window.dispatchEvent(new CustomEvent('sentinel-focus-node', { detail: inc.location.nodeId }));
              }
            }}
            style={{
              padding: "0.75rem 1rem",
              background: dimmed ? "rgba(15, 23, 42, 0.15)" : "rgba(15, 23, 42, 0.4)",
              border: focusedIncidentId === inc.id ? "1px solid var(--primary)" : "1px solid var(--border-dim)",
              borderLeft: `4px solid ${isSpreading ? '#ff0055' : meta.color}`,
              opacity: dimmed ? 0.5 : 1,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "1.25rem",
              alignItems: "center",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!dimmed) e.currentTarget.style.background = "rgba(0, 245, 255, 0.05)";
              e.currentTarget.style.borderColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dimmed ? "rgba(15, 23, 42, 0.15)" : "rgba(15, 23, 42, 0.4)";
              e.currentTarget.style.borderColor = focusedIncidentId === inc.id ? "var(--primary)" : "var(--border-dim)";
            }}
          >
            {/* 1. Time & Icon */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '45px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>{timeStr}</div>
              <div style={{
                width: '32px', height: '32px', borderRadius: '4px',
                background: `${meta.color || 'var(--text-main)'}22`, 
                border: `1px solid ${meta.color || 'var(--text-main)'}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: !dimmed ? `0 0 10px ${meta.color}44` : 'none'
              }}>
                <Icon size={18} color={meta.color || '#fff'} />
              </div>
            </div>

            {/* 2. Content Center */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(inc.id);
                    setEditingField('type');
                  }}
                  style={{ fontSize: '1rem', fontWeight: 900, color: meta.color, letterSpacing: '0.05em', cursor: 'pointer' }}
                >
                  {meta.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', opacity: 0.5 }}>//</span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: '2px',
                  background: inc.confidence > 0.9 ? 'rgba(0,255,159,0.1)' : 'rgba(255,255,255,0.05)',
                  color: inc.confidence > 0.9 ? 'var(--neon-green)' : 'var(--text-muted)',
                  border: `1px solid ${inc.confidence > 0.9 ? 'var(--neon-green)44' : 'var(--border-dim)'}`
                }}>
                  {inc.confidence > 0.9 ? "VERIFIED" : "AI_ESTIMATE"}
                </span>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(inc.id);
                  setEditingField('location');
                }}
                style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <MapPin size={12} color="var(--primary)" />
                {inc.location?.zone?.toUpperCase() || "UNKNOWN_SECTOR"}
                {inc.location?.floor !== undefined && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>[FLR_{inc.location.floor}]</span>}
              </div>

              {inc.description && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{inc.description}"
                </div>
              )}

              {/* Status Tags */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                {isStale && <span style={{ fontSize: '0.55rem', padding: '1px 4px', background: 'rgba(255,159,0,0.1)', color: 'var(--neon-orange)', fontWeight: 800, border: '1px solid var(--neon-orange)44' }}>⚠_STALE</span>}
                {isSpreading && <span style={{ fontSize: '0.55rem', padding: '1px 4px', background: 'rgba(255,0,85,0.1)', color: '#ff0055', fontWeight: 800, border: '1px solid #ff005544', animation: 'pulse 2s infinite' }}>EXPANDING</span>}
                {inc.affected_nodes?.length > 0 && <span style={{ fontSize: '0.55rem', padding: '1px 4px', background: 'rgba(0,245,255,0.1)', color: 'var(--primary)', fontWeight: 800, border: '1px solid var(--primary)44' }}>+{inc.affected_nodes.length}_ESCALATIONS</span>}
              </div>
            </div>

            {/* 3. Action & Control */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', justifyContent: 'center' }}>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(inc.id);
                  setEditingField('status');
                }}
                style={{
                  fontSize: '0.7rem', fontWeight: 900, color: statusMeta.color,
                  border: `1px solid ${statusMeta.color}66`, background: `${statusMeta.color}11`,
                  padding: '4px 10px', borderRadius: '3px', cursor: 'pointer',
                  minWidth: '90px', textAlign: 'center', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${statusMeta.color}33`}
                onMouseLeave={e => e.currentTarget.style.background = `${statusMeta.color}11`}
              >
                {statusMeta.label}
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <Edit2
                  size={14}
                  style={{ color: 'var(--text-dim)', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                  onClick={(e) => { e.stopPropagation(); setEditingId(inc.id); setEditingField('type'); }}
                />
                <Trash2
                  size={14}
                  style={{ color: 'var(--text-dim)', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                  onClick={(e) => { e.stopPropagation(); handleDelete(inc.id); }}
                />
              </div>
            </div>

            {/* Editing Modals Overlay */}
            {editingId === inc.id && editingField === 'type' && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(5, 8, 12, 0.95)", zIndex: 110, padding: "8px",
                display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", alignItems: "center"
              }} onClick={e => e.stopPropagation()}>
                {Object.entries(EVENT_META).map(([key, val]) => (
                  <div
                    key={key}
                    onClick={() => handleUpdate(inc.id, { event_type: key })}
                    style={{
                      padding: "4px 8px", fontSize: "0.6rem", color: val.color, cursor: "pointer",
                      background: `${val.color}11`, border: `1px solid ${val.color}44`, borderRadius: '2px'
                    }}
                  >
                    {val.label}
                  </div>
                ))}
                <X size={14} style={{ cursor: 'pointer', marginLeft: '8px' }} onClick={() => { setEditingId(null); setEditingField(null); }} />
              </div>
            )}

            {editingId === inc.id && editingField === 'status' && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(5, 8, 12, 0.95)", zIndex: 110, padding: "8px",
                display: "flex", gap: "8px", justifyContent: "center", alignItems: "center"
              }} onClick={e => e.stopPropagation()}>
                {Object.entries(STATUS_META).map(([key, value]) => (
                  <div
                    key={key}
                    onClick={() => handleStatusChange(inc.id, key)}
                    style={{
                      padding: "6px 12px", fontSize: "0.6rem", color: value.color, cursor: "pointer",
                      border: `1px solid ${value.color}44`, borderRadius: '2px', fontWeight: 800
                    }}
                  >
                    {value.label}
                  </div>
                ))}
                <X size={14} style={{ cursor: 'pointer', marginLeft: '8px' }} onClick={() => { setEditingId(null); setEditingField(null); }} />
              </div>
            )}

            {editingId === inc.id && editingField === 'location' && (
              <LocationManager
                incident={inc}
                onUpdate={(data) => handleUpdate(inc.id, data)}
                onClose={() => { setEditingId(null); setEditingField(null); }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
