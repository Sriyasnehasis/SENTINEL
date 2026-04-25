import React, { useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from '@react-three/fiber';
import { Stars, CameraControls, Environment, Text, Sphere, Html } from '@react-three/drei';
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
  const [recentIncident, setRecentIncident] = useState(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const lastIncidentCount = useRef(0);
  const controlsRef = useRef();

  // 1. Sync active & investigating incidents
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
        setRecentIncident(newest);
        setHighlightActive(true);

        if (!userNode && controlsRef.current && newest.location?.nodeId) {
          const coords = zoneCoordinates3D[newest.location.nodeId];
          if (coords) {
            controlsRef.current.setLookAt(
              coords[0] + 25, coords[1] + 20, coords[2] + 35, 
              coords[0], coords[1], coords[2],               
              true                                            
            );
            setTimeout(() => setHighlightActive(false), 4500);
          }
        }
      }
      lastIncidentCount.current = activeData.length;
    });

    return () => unsubIncidents();
  }, [userNode]);

  // 2. Pathfinding
  const pathStartNode = useMemo(() => {
    if (userNode) return userNode;
    return incidents.length > 0 && incidents[0].location?.nodeId ? incidents[0].location.nodeId : DEFAULT_START;
  }, [userNode, incidents]);

  const bestPath = useMemo(() => {
    const activeIsEmergency = userNode ? isEmergency : incidents.length > 0;
    if (activeIsEmergency && pathStartNode && buildingGraph) {
      const { blocked, hazardMap } = getBlockedNodes(incidents);
      let calculatedPath = [];
      ASSEMBLY_GOALS.forEach(goal => {
        const path = dijkstra(buildingGraph, pathStartNode, goal, blocked, hazardMap);
        if (path.length > 0 && (calculatedPath.length === 0 || path.length < calculatedPath.length)) {
          calculatedPath = path;
        }
      });
      return calculatedPath;
    }
    return [];
  }, [isEmergency, pathStartNode, incidents, userNode]);

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
