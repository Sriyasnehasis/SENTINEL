import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

/**
 * SitRepPanel — Displays AI-generated Situation Report from Gemini
 * Reads from Firestore /sessions/current document
 * Shows severity, safe/blocked exits, affected floors, mobility-impaired alerts
 */
export default function SitRepPanel() {
  const [sitrep, setSitrep] = useState(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "sessions", "current"),
      (snap) => {
        const data = snap.data();
        
        if (!data) {
          setSitrep(null);
          setLoading(false);
          return;
        }
        
        // Check for errors
        if (data?.sitrep_error) {
          setStale(true);
          setLoading(false);
          return;
        }
        
        // Update sitrep if available
        if (data?.current_sitrep) {
          setSitrep(data.current_sitrep);
          setStale(false);
        }
        
        setLoading(false);
      },
      (error) => {
        console.error("SitRep Panel error:", error);
        setLoading(false);
        setStale(true);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: "1.5rem", 
        textAlign: "center", 
        color: "var(--text-muted)" 
      }}>
        <div className="pulse-loader" />
        <p style={{ marginTop: "1rem" }}>Awaiting AI situation report...</p>
      </div>
    );
  }

  if (!sitrep) {
    return (
      <div style={{ 
        padding: "1.5rem", 
        textAlign: "center", 
        color: "var(--text-muted)",
        border: "2px dashed rgba(255,255,255,0.1)",
        borderRadius: "8px"
      }}>
        <p>No active incidents requiring AI analysis</p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          SitRep will appear here when incidents are detected
        </p>
      </div>
    );
  }

  const severityConfig = {
    P0: { 
      color: "#F44336", 
      bg: "rgba(244,67,54,0.1)", 
      label: "🚨 P0 - CRITICAL",
      borderColor: "#F44336"
    },
    P1: { 
      color: "#FF9800", 
      bg: "rgba(255,152,0,0.1)", 
      label: "⚠️ P1 - HIGH RISK",
      borderColor: "#FF9800"
    },
    P2: { 
      color: "#2196F3", 
      bg: "rgba(33,150,243,0.1)", 
      label: "ℹ️ P2 - MONITOR",
      borderColor: "#2196F3"
    },
  };

  const config = severityConfig[sitrep.severity] || severityConfig.P2;

  return (
    <div style={{
      border: `2px solid ${config.borderColor}`,
      borderRadius: "8px",
      padding: "1.5rem",
      background: config.bg,
      animation: "fadeIn 0.3s ease-out"
    }}>
      {/* Stale Warning */}
      {stale && (
        <div style={{
          background: "rgba(255,152,0,0.2)",
          border: "1px solid #FF9800",
          borderRadius: "6px",
          padding: "0.5rem 1rem",
          marginBottom: "1rem",
          color: "#FF9800",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <span>⚠️</span> Showing last cached report — AI service unavailable
        </div>
      )}

      {/* Severity Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        paddingBottom: "1rem",
        borderBottom: `1px solid ${config.color}33`
      }}>
        <h2 style={{ 
          color: config.color, 
          fontWeight: 800, 
          fontSize: "1.5rem",
          margin: 0
        }}>
          {config.label}
        </h2>
        <span style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          AI-Generated
        </span>
      </div>

      {/* Threat Summary */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ 
          fontSize: "0.75rem", 
          color: "var(--text-muted)", 
          textTransform: "uppercase", 
          letterSpacing: "0.05em",
          marginBottom: "0.5rem"
        }}>
          Threat Summary
        </h3>
        <p style={{ fontSize: "1rem", lineHeight: 1.5, margin: 0 }}>
          {sitrep.threat_summary || "No summary available"}
        </p>
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "1.25rem",
        marginBottom: "1.25rem"
      }}>
        {/* Safe Exits */}
        <div>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "#22c55e", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem"
          }}>
            <span style={{ fontSize: "1rem" }}>✅</span> Safe Exits
          </h3>
          {sitrep.safe_exits?.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "#22c55e" }}>
              {sitrep.safe_exits.map((exit, i) => (
                <li key={i} style={{ marginBottom: "0.25rem" }}>{exit}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No safe exits identified</p>
          )}
        </div>

        {/* Blocked Exits */}
        <div>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "#F44336", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem"
          }}>
            <span style={{ fontSize: "1rem" }}>🚫</span> Blocked Exits
          </h3>
          {sitrep.blocked_exits?.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "#F44336" }}>
              {sitrep.blocked_exits.map((exit, i) => (
                <li key={i} style={{ marginBottom: "0.25rem" }}>{exit}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>All exits accessible</p>
          )}
        </div>
      </div>

      {/* Affected Floors */}
      {sitrep.affected_floors?.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem"
          }}>
            Affected Floors
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {sitrep.affected_floors.map((floor, i) => (
              <span key={i} style={{
                background: "rgba(244,67,54,0.15)",
                color: "#F44336",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "0.85rem",
                border: "1px solid rgba(244,67,54,0.3)"
              }}>
                Floor {floor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mobility Impaired Alert */}
      {sitrep.mobility_impaired_flagged?.length > 0 && (
        <div style={{
          background: "rgba(244,67,54,0.15)",
          border: "1px solid #F44336",
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "#F44336", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem"
          }}>
            <span style={{ fontSize: "1rem" }}>⚠️</span> Mobility-Impaired Guests Flagged
          </h3>
          <p style={{ color: "#F44336", margin: 0, fontWeight: 600 }}>
            Priority evacuation needed: {sitrep.mobility_impaired_flagged.join(", ")}
          </p>
        </div>
      )}

      {/* Recommended Actions */}
      {sitrep.recommended_actions?.length > 0 && (
        <div>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem"
          }}>
            Recommended Actions
          </h3>
          <ol style={{ margin: 0, paddingLeft: "1.5rem" }}>
            {sitrep.recommended_actions.map((action, i) => (
              <li key={i} style={{ marginBottom: "0.5rem", lineHeight: 1.5 }}>
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Zone Scores (Optional Debug View) */}
      {sitrep.zone_scores && Object.keys(sitrep.zone_scores).length > 0 && (
        <div style={{
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h3 style={{ 
            fontSize: "0.75rem", 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "0.5rem"
          }}>
            Zone Risk Scores
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(sitrep.zone_scores).map(([zone, score]) => {
              const scoreColor = score >= 8 ? "#F44336" : score >= 5 ? "#FF9800" : "#22c55e";
              return (
                <span key={zone} style={{
                  background: `${scoreColor}15`,
                  color: scoreColor,
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  border: `1px solid ${scoreColor}33`
                }}>
                  {zone}: {score}/10
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
