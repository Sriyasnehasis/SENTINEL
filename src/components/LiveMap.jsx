import React, { useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from '@react-three/fiber';
import { Stars, CameraControls, Environment, Text, Sphere, Html } from '@react-three/drei';
import { db } from "../firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { dijkstra, getBlockedNodes } from "../utils/dijkstra";
import { buildingGraph, zoneCoordinates3D, hospitalData } from "../utils/buildingGraph";
import { BuildingModel } from "./Building3D";

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSEMBLY_GOALS = ["EXT-Assembly-Front", "EXT-Assembly-Rear"];
const DEFAULT_START = "MT-G-Lobby";

function UserHighlight({ position }) {
  return (
    <group position={[position[0], position[1] + 0.5, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.8, 32]} />
        <meshBasicMaterial color="var(--neon-green)" transparent opacity={0.8} />
      </mesh>
      <Text position={[0, 2, 0]} fontSize={0.8} color="white">YOU_ARE_HERE</Text>
      <Sphere args={[0.3, 16, 16]}>
        <meshBasicMaterial color="var(--neon-green)" />
      </Sphere>
    </group>
  );
}

export default function LiveMap({ userNode = null, isEmergency = false, onNodeSelect = null }) {
  const [incidents, setIncidents] = useState([]);
  const [occupants, setOccupants] = useState([]);
  const [multiPaths, setMultiPaths] = useState([]);
  const [bestPath, setBestPath] = useState([]);
  const [startingNode, setStartingNode] = useState(userNode || DEFAULT_START);
  const [recentIncident, setRecentIncident] = useState(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const lastIncidentCount = useRef(0);
  const lastFocusedId = useRef(null);
  const controlsRef = useRef();

  // Configure smoother camera defaults on mount
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.smoothTime = 0.8;         // Higher for more cinematic feel (default 0.25)
      controlsRef.current.draggingSmoothTime = 0.4; // Smoother manual movement
    }
  }, []);

  // 1. Sync active incidents from Firestore
  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "in", ["ACTIVE", "INVESTIGATING"]));
    const unsubIncidents = onSnapshot(q, (snap) => {
      const activeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sortedData = [...activeData].sort((a, b) => {
        const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      setIncidents(activeData);

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
    });

    return () => unsubIncidents();
  }, [userNode]);

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
    
    const { blocked, hazardMap } = getBlockedNodes(incidents);
    
    // CASE A: Multi-Occupant Demo Mode
    if (occupants.length > 0) {
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
>>>>>>> origin/main
      let calculatedPath = [];
      ASSEMBLY_GOALS.forEach(goal => {
        const path = dijkstra(buildingGraph, pathStartNode, goal, blocked, hazardMap);
        if (path.length > 0 && (calculatedPath.length === 0 || path.length < calculatedPath.length)) {
          calculatedPath = path;
        }
      });
<<<<<<< HEAD
      return calculatedPath;
    }
    return [];
  }, [isEmergency, pathStartNode, incidents, userNode]);
=======
      setBestPath(calculatedPath);
      setMultiPaths([]);
    }
  }, [incidents, occupants, startingNode]);
>>>>>>> origin/main

  // 3. Focus handling
  useEffect(() => {
    if (controlsRef.current && userNode) {
      const coords = zoneCoordinates3D[userNode];
      if (coords) {
        controlsRef.current.setLookAt(coords[0] + 40, coords[1] + 30, coords[2] + 40, coords[0], coords[1], coords[2], true);
      }
    }
  }, [userNode]);

  // 4. Node selection event handling
  const handleNodeClick = (nodeId) => {
    if (userNode) return; // Guests have read-only map
    setSelectedNode(nodeId);
    if (onNodeSelect) onNodeSelect(nodeId);
    
    // Zoom to selected node
    if (controlsRef.current && zoneCoordinates3D[nodeId]) {
      const c = zoneCoordinates3D[nodeId];
      controlsRef.current.setLookAt(c[0] + 15, c[1] + 10, c[2] + 20, c[0], c[1], c[2], true);
    }
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative", overflow: "hidden", background: "transparent" }}>
      <Canvas camera={{ position: [0, 60, 100], fov: 35 }}>
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <CameraControls ref={controlsRef} />
        <ambientLight intensity={0.4} />
        
        <BuildingModel 
          activeIncidents={incidents} 
          evacuationRoute={bestPath} 
          multiPaths={multiPaths}
          recentIncident={recentIncident}
          highlightActive={highlightActive}
          selectedNode={selectedNode}
          hoveredNode={hoveredNode}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
        />

        {userNode && zoneCoordinates3D[userNode] && (
          <UserHighlight position={zoneCoordinates3D[userNode]} />
        )}
      </Canvas>

      {/* Admin Information Overlay */}
      {!userNode && selectedNode && (
        <div style={{
          position: "absolute", top: "20px", left: "20px", 
          background: "rgba(15, 23, 42, 0.9)", border: "1px solid var(--primary)",
          padding: "1rem", color: "white", fontFamily: "JetBrains Mono",
          pointerEvents: "none", borderRadius: "2px"
        }}>
          <div style={{ fontSize: "0.55rem", color: "var(--primary)" }}>SELECTED_NODE_UPLINK</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 900 }}>{selectedNode}</div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {hospitalData.nodes[selectedNode]?.name}
          </div>
        </div>
      )}

      {/* Bottom HUD */}
      <div style={{ position: "absolute", bottom: "20px", left: "20px", pointerEvents: "none" }}>
        <div style={{ 
          background: "rgba(15, 23, 42, 0.8)", 
          padding: "10px 15px", 
          border: "1px solid var(--border-tactical)",
          borderLeft: `4px solid ${userNode ? (isEmergency ? 'var(--accent)' : 'var(--neon-green)') : 'var(--primary)'}`,
          fontFamily: "JetBrains Mono"
        }}>
          <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 800 }}>
            {userNode ? (isEmergency ? "EVACUATION_MODE" : "UNIT_NOMINAL") : "CMD_RADAR_ACTIVE"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 700 }}>
            {userNode ? `LOCATION::${userNode}` : `TRACKING::${incidents.length}_SIGNALS`}
          </div>
        </div>
      </div>
    </div>
  );
}
