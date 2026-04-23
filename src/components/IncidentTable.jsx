import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit, updateDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Flame, Wind, UserX, Activity, Clock, MapPin, AlertTriangle, Plus, X, Search, Edit2, Trash2 } from "lucide-react";
import { hospitalData } from "../utils/buildingGraph";

const EVENT_META = {
  FIRE:    { color: "var(--accent)", bg: "rgba(255,0,85,0.15)",   label: "FIRE",    icon: Flame },
  SMOKE:   { color: "var(--neon-orange)", bg: "rgba(255,159,0,0.15)",  label: "SMOKE",   icon: Wind },
  TRAPPED: { color: "var(--primary)", bg: "rgba(0,245,255,0.15)",  label: "TRAPPED", icon: UserX },
  MEDICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.15)",  label: "MEDICAL", icon: Activity },
  INJURY:  { color: "var(--neon-orange)", bg: "rgba(245,158,11,0.15)",  label: "INJURY",  icon: AlertTriangle },
  PANIC:   { color: "#ec4899", bg: "rgba(236,72,153,0.15)",  label: "PANIC",   icon: AlertTriangle },
  MASS_CASUALTY: { color: "#ff0000", bg: "rgba(255,0,0,0.25)", label: "MCI", icon: AlertTriangle },
};

const TYPE_PRIORITY_BONUS = {
  FIRE: 60,
  MEDICAL: 50,
  SMOKE: 40,
  TRAPPED: 35,
  INJURY: 25,
  PANIC: 15,
  MASS_CASUALTY: 100,
};

const STATUS_BASE_SCORE = {
  ACTIVE: 1000,
  INVESTIGATING: 100,
  RESOLVED: 0,
};

function calculatePriority(inc) {
  const base   = STATUS_BASE_SCORE[inc.status] ?? 0;
  const type   = TYPE_PRIORITY_BONUS[inc.event_type] ?? 0;
  const spread = (inc.affected_nodes?.length ?? 0) * 20;
  const ageMs  = inc.timestamp ? Date.now() - new Date(inc.timestamp) : 0;
  // Age bonus: unresolved older incidents rise slightly (prevents "forgotten" incidents)
  // 0.5 points per minute, capped at 15 points (30 mins)
  const ageFactor = inc.status === 'ACTIVE' ? Math.min(ageMs / 120000, 15) : 0;
  return base + type + spread + ageFactor;
}

const STATUS_META = {
  ACTIVE:       { color: "var(--accent)", label: "CRITICAL" },
  INVESTIGATING:{ color: "var(--neon-orange)", label: "DISPATCHED" },
  RESOLVED:     { color: "var(--neon-green)", label: "SECURE" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {incidents.map((inc, idx) => {
        const meta = EVENT_META[inc.event_type] || {
          color: "var(--text-muted)", label: inc.event_type
        };
        const statusMeta = STATUS_META[inc.status] || { color: "var(--text-muted)", label: inc.status };
        const timeStr = inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : "--:--";
        const isStale = inc.status === 'ACTIVE' && inc.timestamp && (Date.now() - new Date(inc.timestamp)) > 30 * 60 * 1000;
        const dimmed  = inc.status === 'RESOLVED';
        const isSpreading = inc.status === 'ACTIVE' && (inc.affected_nodes?.length ?? 0) >= 2;
        const priority = calculatePriority(inc);

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
              padding: "0.8rem 1rem",
              borderLeft: `2px solid ${
                isSpreading ? '#ff0055' : inc.status === 'ACTIVE' ? 'var(--accent)' : 'var(--border-dim)'
              }`,
              background: "rgba(15, 23, 42, 0.3)",
              opacity: dimmed ? 0.6 : 1,
              cursor: inc.location?.nodeId ? "pointer" : "default",
              fontFamily: "JetBrains Mono",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "var(--transition-heavy)",
              animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
              position: "relative"
            }}
            className={focusedIncidentId === inc.id ? "focused-incident" : ""}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 245, 255, 0.08)";
              e.currentTarget.style.borderLeftColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.3)";
              e.currentTarget.style.borderLeftColor = inc.status === 'ACTIVE' ? 'var(--accent)' : 'var(--border-dim)';
            }}
          >
            {editingId === inc.id && editingField === 'location' && (
              <LocationManager 
                incident={inc} 
                onUpdate={(data) => handleUpdate(inc.id, data)}
                onClose={() => { setEditingId(null); setEditingField(null); }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{timeStr}</span>
                <span>//</span>
                <span style={{ color: "var(--text-main)", opacity: 0.9 }}>L-{inc.location?.floor ?? "X"}</span>
                <span style={{ 
                  fontSize: "0.5rem", 
                  color: inc.confidence > 0.9 ? "var(--neon-green)" : "var(--text-dim)",
                  border: `1px solid ${inc.confidence > 0.9 ? "var(--neon-green)44" : "var(--border-dim)"}`,
                  padding: "0px 4px",
                  borderRadius: "2px"
                }}>
                  {inc.confidence > 0.9 ? "VERIFIED" : "AI_ANALYSIS"}
                </span>
                {isStale && (
                  <span style={{ color: "var(--neon-orange)", fontSize: "0.55rem", fontWeight: 900, background: "rgba(255,159,0,0.1)", padding: "1px 4px", borderRadius: "2px" }}>
                    ⚠_STALE
                  </span>
                )}
                {isSpreading && (
                  <span style={{ color: "#ff0055", fontSize: "0.55rem", fontWeight: 900, background: "rgba(255,0,85,0.1)", padding: "1px 4px", borderRadius: "2px", animation: "pulse 1.5s infinite" }}>
                    EXPANDING
                  </span>
                )}
              </div>
              
              <div style={{ position: "relative" }}>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(inc.id);
                    setEditingField('type');
                  }}
                  style={{ 
                    fontSize: "0.95rem", fontWeight: 800, color: meta.color, 
                    letterSpacing: "0.1em", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                  }}
                >
                  {meta.label} <Edit2 size={10} style={{ opacity: 0.4 }} />
                </div>

                {editingId === inc.id && editingField === 'type' && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, background: "var(--bg-panel)",
                    border: "1px solid var(--border-dim)", zIndex: 110, padding: "4px", minWidth: "120px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                  }}>
                    {Object.entries(EVENT_META).map(([key, val]) => (
                      <div 
                        key={key}
                        onClick={(e) => { e.stopPropagation(); handleUpdate(inc.id, { event_type: key }); }}
                        style={{ padding: "6px 10px", fontSize: "0.6rem", color: val.color, cursor: "pointer", background: inc.event_type === key ? `${val.color}11` : "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = `${val.color}22`}
                        onMouseLeave={e => e.currentTarget.style.background = inc.event_type === key ? `${val.color}11` : "transparent"}
                      >
                        {val.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(inc.id);
                  setEditingField('location');
                }}
                style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                {inc.location?.zone?.toUpperCase() ?? "UNKNOWN_SECTOR"}
                {inc.affected_nodes?.length > 0 && <span style={{ color: "var(--accent)", fontSize: "0.6rem" }}>+{inc.affected_nodes.length}_NODES</span>}
                <MapPin size={10} style={{ opacity: 0.5 }} />
              </div>
            </div>

            <div style={{ textAlign: "right", position: "relative" }}>
              <div style={{ position: "absolute", top: "-15px", right: "0", fontSize: "0.45rem", color: "var(--text-dim)", fontWeight: 700 }}>
                P_SCORE::{Math.floor(priority)}
              </div>
              {editingId === inc.id && editingField === 'status' ? (
                <div style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "2px",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  padding: "4px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  minWidth: "100px"
                }}>
                  {Object.entries(STATUS_META).map(([key, value]) => (
                    <div
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(inc.id, key);
                      }}
                      style={{
                        padding: "6px 8px",
                        fontSize: "0.55rem",
                        color: value.color,
                        cursor: "pointer",
                        fontWeight: 700,
                        background: inc.status === key ? `${value.color}22` : "transparent",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${value.color}33`}
                      onMouseLeave={(e) => e.currentTarget.style.background = inc.status === key ? `${value.color}22` : "transparent"}
                    >
                      {value.label}
                    </div>
                  ))}
                  <div 
                    onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditingField(null); }}
                    style={{ 
                      padding: "4px 8px", 
                      fontSize: "0.45rem", 
                      color: "var(--text-muted)", 
                      textAlign: "center", 
                      borderTop: "1px solid var(--border-dim)",
                      marginTop: "4px",
                      cursor: "pointer"
                    }}
                  >
                    CANCEL_ACTION
                  </div>
                </div>
              ) : (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(inc.id);
                    setEditingField('status');
                  }}
                  style={{ 
                    fontSize: "0.65rem", 
                    fontWeight: 800, 
                    color: statusMeta.color, 
                    border: `1px solid ${statusMeta.color}44`,
                    padding: "3px 8px",
                    borderRadius: "2px",
                    background: `${statusMeta.color}11`,
                    cursor: "pointer",
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {statusMeta.label}
                </div>
              )}
              {inc.location?.room && (
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "6px", fontWeight: 600 }}>
                  RM::{inc.location.room}
                </div>
              )}
              
              <div 
                onClick={(e) => { e.stopPropagation(); handleDelete(inc.id); }}
                style={{ 
                  marginTop: "8px", 
                  color: "var(--text-dim)", 
                  cursor: "pointer", 
                  display: "flex", 
                  justifyContent: "flex-end",
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-dim)"}
                title="DELETE_INCIDENT"
              >
                <Trash2 size={12} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
