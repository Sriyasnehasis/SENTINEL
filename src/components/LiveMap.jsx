import React, { useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from '@react-three/fiber';
import { Stars, CameraControls, Environment } from '@react-three/drei';
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { dijkstra, getBlockedNodes } from "../utils/dijkstra";
import { buildingGraph, zoneCoordinates3D } from "../utils/buildingGraph";
import { BuildingModel } from "./Building3D";
import { AlertTriangle } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSEMBLY_GOALS = ["EXT-Assembly-Front", "EXT-Assembly-Rear"];
const DEFAULT_START = "MT-G-Lobby";

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [startingNode, setStartingNode] = useState(DEFAULT_START);
  const [recentIncident, setRecentIncident] = useState(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const lastIncidentCount = useRef(0);
  const controlsRef = useRef();

  // 1. Sync active incidents from Firestore
  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "==", "ACTIVE"));
    return onSnapshot(q, (snap) => {
      const activeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort to find the most recently created incident
      const sortedData = [...activeData].sort((a, b) => {
        const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      setIncidents(activeData);

      // FEATURE: Detect NEW incident and trigger focus/highlight
      if (activeData.length > lastIncidentCount.current && sortedData.length > 0) {
        const newest = sortedData[0];
        setRecentIncident(newest);
        setHighlightActive(true);

        // Shift camera focus to the new incident
        if (controlsRef.current && newest.location?.nodeId) {
          const coords = zoneCoordinates3D[newest.location.nodeId];
          if (coords) {
            controlsRef.current.setLookAt(
              coords[0] + 25, coords[1] + 20, coords[2] + 35, // Position
              coords[0], coords[1], coords[2],               // Target
              true                                            // Smooth transition
            );

            // Revert focus after 4.5 seconds
            setTimeout(() => {
              setHighlightActive(false);
              if (controlsRef.current) {
                controlsRef.current.setLookAt(0, 60, 100, 0, 0, 0, true);
              }
            }, 4500);
          }
        }
      }
      
      lastIncidentCount.current = activeData.length;

      // Update pathfinding starting node
      if (activeData.length > 0 && activeData[0].location?.nodeId) {
        setStartingNode(activeData[0].location.nodeId);
      } else {
        setStartingNode(DEFAULT_START);
      }
    });
  }, []);

  // 2. Calculate rescue path
  useEffect(() => {
    if (buildingGraph && startingNode && zoneCoordinates3D[startingNode]) {
      const blocked = getBlockedNodes(incidents);
      let calculatedPath = [];
      
      ASSEMBLY_GOALS.forEach(goal => {
        const path = dijkstra(buildingGraph, startingNode, goal, blocked);
        if (path.length > 0 && (calculatedPath.length === 0 || path.length < calculatedPath.length)) {
          calculatedPath = path;
        }
      });

      setBestPath(calculatedPath);
    }
  }, [incidents, startingNode]);

  // 3. Listen for manual focus events from table
  useEffect(() => {
    const handleFocus = (e) => {
      const nodeId = e.detail;
      if (nodeId && zoneCoordinates3D[nodeId]) {
        setStartingNode(nodeId);
      }
    };
    window.addEventListener('sentinel-focus-node', handleFocus);
    return () => window.removeEventListener('sentinel-focus-node', handleFocus);
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative", overflow: "hidden", background: "transparent" }}>
      <Canvas camera={{ position: [0, 60, 100], fov: 40 }}>
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <CameraControls ref={controlsRef} />
        <ambientLight intensity={0.5} />

        {/* Use the reliable BuildingModel with focus props */}
        <BuildingModel 
          activeIncidents={incidents} 
          evacuationRoute={bestPath} 
          recentIncident={recentIncident}
          highlightActive={highlightActive}
        />
      </Canvas>

      {/* HUD Notification — Modernized for new UI */}
      <div style={{ position: "absolute", top: "20px", left: "20px", pointerEvents: "none" }}>
        <div style={{ 
          background: "var(--bg-panel)", 
          padding: "10px 15px", 
          border: "1px solid var(--border-dim)",
          borderLeft: "4px solid var(--accent)",
          fontFamily: "JetBrains Mono"
        }}>
          <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>Emergency Node Active</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 700 }}>ORIGIN::{startingNode}</div>
        </div>
      </div>
    </div>
  );
}
