import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ShieldCheck, RotateCcw } from "lucide-react";

export default function ZoneClearButton({ staffId, zone }) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!staffId || !zone) return;
    setClearing(true);
    try {
      await setDoc(doc(db, "staff", staffId), {
        zone_cleared: true,
        zone_cleared_at: new Date().toISOString(),
        zone_assigned: zone,
      }, { merge: true });

      const q = query(collection(db, "incidents"), where("status", "==", "ACTIVE"));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(incidentDoc => 
        updateDoc(doc(db, "incidents", incidentDoc.id), {
          status: "RESOLVED",
          resolved_at: new Date().toISOString()
        })
      );
      
      await Promise.all(updatePromises);
      
      // Wipe AI SitRep to prevent stale warnings
      await setDoc(doc(db, "sessions", "current"), {
        current_sitrep: null,
        last_updated: new Date().toISOString(),
        incident_count: 0
      }, { merge: true });

      console.log(`✅ Zone ${zone} marked as clear.`);
      alert(`✅ INCIDENT_LOGS_PURGED`);
    } catch (error) {
      console.error("Failed to mark zone clear:", error);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <button
        id="zone-clear-btn"
        onClick={handleClear}
        disabled={clearing}
        className="hacker-btn-green"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          height: "100%",
          background: "transparent",
          color: "var(--neon-green)",
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.65rem",
          padding: "0 1rem",
          borderRadius: "0",
          border: "1px solid var(--neon-green)",
          cursor: clearing ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          textTransform: "uppercase",
          letterSpacing: "0.1em"
        }}
      >
        {clearing ? (
          <>
            <RotateCcw size={14} className="animate-spin" />
            PURGING_DATABASE...
          </>
        ) : (
          <>
            <ShieldCheck size={14} />
            CLEAR_INCIDENTS
          </>
        )}
      </button>

      <style>{`
        .hacker-btn-green:hover:not(:disabled) {
          background: var(--neon-green) !important;
          color: var(--bg-void) !important;
          box-shadow: 0 0 15px rgba(0, 255, 159, 0.3);
        }
        .hacker-btn-green:active:not(:disabled) {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}
