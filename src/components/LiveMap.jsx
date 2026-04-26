import React, { useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from '@react-three/fiber';
import { Stars, CameraControls, Environment } from '@react-three/drei';
import { db } from "../firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { dijkstra, getBlockedNodes } from "../utils/dijkstra";
import { buildingGraph, zoneCoordinates3D } from "../utils/buildingGraph";
import { BuildingModel } from "./Building3D";
import { AlertTriangle } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSEMBLY_GOALS = ["EXT-Assembly-Front", "EXT-Assembly-Rear"];
const DEFAULT_START = "MT-G-Lobby";

export default function LiveMap({ userNode = DEFAULT_START, isEmergency = false, isAdmin = false }) {
  const [incidents, setIncidents] = useState([]);
  const [occupants, setOccupants] = useState([]);
  const [multiPaths, setMultiPaths] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [startingNode, setStartingNode] = useState(userNode);
  const [recentIncident, setRecentIncident] = useState(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const lastIncidentCount = useRef(0);
  const lastFocusedId = useRef(null);
  const controlsRef = useRef();

  // Sync starting node with prop
  useEffect(() => {
    if (userNode) setStartingNode(userNode);
  }, [userNode]);

  // Configure smoother camera defaults on mount
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.smoothTime = 0.8;         // Higher for more cinematic feel (default 0.25)
      controlsRef.current.draggingSmoothTime = 0.4; // Smoother manual movement
    }
  }, []);

  // 1. Sync active incidents from Firestore
  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "in", ["ACTIVE", "RESCUE"]));
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
        
        // Prevent redundant camera jumps if snapshot fires multiple times for same incident
        if (newest.id !== lastFocusedId.current) {
          lastFocusedId.current = newest.id;
          setRecentIncident(newest);
          setHighlightActive(true);

          // Shift camera focus to the new incident with optimized transition
          if (controlsRef.current && newest.location?.nodeId) {
            const coords = zoneCoordinates3D[newest.location.nodeId];
            if (coords) {
              controlsRef.current.setLookAt(
                coords[0] + 18, coords[1] + 15, coords[2] + 25, // Slightly closer for less "jump"
                coords[0], coords[1], coords[2],               // Target
                true                                            // Smooth transition
              );

              // Revert focus after 5 seconds
              setTimeout(() => {
                setHighlightActive(false);
                if (controlsRef.current) {
                  controlsRef.current.setLookAt(0, 60, 100, 0, 0, 0, true);
                }
              }, 5000);
            }
          }
        }
      }
      
      lastIncidentCount.current = activeData.length;

      // Update pathfinding starting node (Admin only fallback if no userNode)
      if (activeData.length > 0 && activeData[0].location?.nodeId && userNode === DEFAULT_START) {
        setStartingNode(activeData[0].location.nodeId);
      }
    });
  }, []);

  // 2. Sync session metadata (Occupants)
  useEffect(() => {
    return onSnapshot(doc(db, "sessions", "current"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.occupants) {
          setOccupants(data.occupants);
        }
      }
    });
  }, []);

  // 3. Calculate paths for all occupants (or fallback to single incident)
  useEffect(() => {
    if (!buildingGraph) return;

    // FEATURE: If no incidents and not in emergency mode, clear all paths
    if (incidents.length === 0 && !isEmergency) {
      setBestPath([]);
      setMultiPaths([]);
      return;
    }
    
    const { blocked, hazardMap } = getBlockedNodes(incidents);
    
    // CASE A: Multi-Occupant Demo Mode (ADMIN ONLY)
    if (isAdmin && occupants.length > 0) {
      const calculatedPaths = occupants.map(occ => {
        let pathForOcc = [];
        ASSEMBLY_GOALS.forEach(goal => {
          const path = dijkstra(buildingGraph, occ.startNode, goal, blocked, hazardMap);
          if (path.length > 0 && (pathForOcc.length === 0 || path.length < pathForOcc.length)) {
            pathForOcc = path;
          }
        });
        return { id: occ.id, path: pathForOcc, color: occ.color, label: occ.label };
      });
      setMultiPaths(calculatedPaths);
      setBestPath([]); // Clear legacy single path
    } 
    // CASE B: Standard Incident Tracking
    else if (startingNode && zoneCoordinates3D[startingNode]) {
      let calculatedPath = [];
      ASSEMBLY_GOALS.forEach(goal => {
        const path = dijkstra(buildingGraph, startingNode, goal, blocked, hazardMap);
        if (path.length > 0 && (calculatedPath.length === 0 || path.length < calculatedPath.length)) {
          calculatedPath = path;
        }
      });
      setBestPath(calculatedPath);
      setMultiPaths([]);
    }
  }, [incidents, occupants, startingNode, isEmergency]);

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
          multiPaths={multiPaths}
          recentIncident={recentIncident}
          highlightActive={highlightActive}
          userLocation={userNode !== DEFAULT_START ? userNode : null}
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
