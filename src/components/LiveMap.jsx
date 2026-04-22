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
  const controlsRef = useRef();

  // 1. Sync active incidents from Firestore
  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "==", "ACTIVE"));
    return onSnapshot(q, (snap) => {
      const activeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncidents(activeData);

      // FEATURE: Start evacuation path from the first active incident location
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

      // Auto-zoom to incident when it occurs
      if (startingNode !== DEFAULT_START && controlsRef.current) {
        const coords = zoneCoordinates3D[startingNode];
        if (coords) {
          controlsRef.current.setLookAt(coords[0] + 35, coords[1] + 25, coords[2] + 45, coords[0], coords[1], coords[2], true);
        }
      }
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
    <div style={{ height: "650px", position: "relative", borderRadius: "16px", overflow: "hidden", background: "#030508", border: "1px solid rgba(255,255,255,0.05)" }}>
      <Canvas camera={{ position: [0, 60, 100], fov: 40 }}>
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <CameraControls ref={controlsRef} />
        <ambientLight intensity={0.5} />

        {/* Use the reliable BuildingModel */}
        <BuildingModel activeIncidents={incidents} evacuationRoute={bestPath} />
      </Canvas>

      {/* HUD Notification */}
      <div style={{ position: "absolute", top: "20px", left: "20px", pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.85)", padding: "12px 18px", borderRadius: "10px", borderLeft: "4px solid #ef4444", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Emergency Node Active</div>
          <div style={{ fontSize: "0.9rem", color: "white", fontWeight: 900 }}>Origin: {startingNode}</div>
        </div>
      </div>
    </div>
  );
}
