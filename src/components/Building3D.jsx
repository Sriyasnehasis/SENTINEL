/**
 * SENTINEL v3.0 — Production-Grade 3D Hospital Building Model
 *
 * Architecture:
 *  - Main Tower (MT): 6 Floors + Roof Helipad  (50×30 footprint)
 *  - ER Wing (offset [0,0,-40]):  2 Floors
 *  - ICU Wing (offset [50,0,0]):  4 Floors (floors 1–4)
 *  - OPD Wing (offset [-45,0,0]): 2 Floors
 *  - 4 Stairwells (A/B normal, C/D fire-rated)
 *  - 2 Elevator Banks
 *  - 2 External Fire Escapes
 *  - 5 Skybridges connecting wings
 *  - Hazard beacons, evacuation path, glowing router dots
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { zoneCoordinates3D } from '../utils/buildingGraph';

// ─── Constants ────────────────────────────────────────────────────────────────
const FH = 5;             // Floor height (metres in scene units)
const NUM_FLOORS_MT  = 5; // Main Tower: floors 0–4 + roof slab
const NUM_FLOORS_ER  = 2; // ER Wing: floors 0–1
const NUM_FLOORS_ICU = 4; // ICU Wing: floors 1–4
const NUM_FLOORS_OPD = 2; // OPD Wing: floors 0–1
const NUM_FLOORS_ICU = 4; // ICU Wing: floors 1–4
const NUM_FLOORS_OPD = 2; // OPD Wing: floors 0–1

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * A single floor slab with edge outline.
 * Optimized for a 'Digital Glass' aesthetic.
 */
function FloorSlab({ position, size, color = '#00E5FF', isActive, isHovered, isSelected, onHover, onClick }) {
  const [w, h, d] = size;
  const dangerColor = '#ff0055'; 
  const selectionColor = '#00f5ff';

  return (
    <group 
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); onHover && onHover(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover && onHover(false); }}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
    >
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={isActive ? dangerColor : isSelected ? selectionColor : color}
          transparent
          opacity={isActive ? 0.45 : isSelected ? 0.25 : isHovered ? 0.15 : 0.05}
          emissive={isActive ? dangerColor : isSelected ? selectionColor : color}
          emissiveIntensity={isActive ? 1.2 : isSelected ? 0.8 : isHovered ? 0.4 : 0}
        />
      </mesh>
      
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial
          color={isActive ? dangerColor : isSelected || isHovered ? selectionColor : color}
          transparent
          opacity={isActive ? 1.0 : isSelected || isHovered ? 0.9 : 0.55}
        />
      </lineSegments>
    </group>
  );
}

/** Structural glowing pillar / column */
function Pillar({ position, height = FH, radius = 0.15, color = '#00E5FF' }) {
  return (
    <group position={position}>
      <Cylinder args={[radius, radius, height, 8]}>
        <meshStandardMaterial color="#283593" metalness={1} roughness={0.1} />
      </Cylinder>
      {/* Brighter edge highlight on pillar */}
      <Cylinder args={[radius + 0.03, radius + 0.03, height, 8]}>
        <meshStandardMaterial color={color} transparent opacity={0.65} wireframe />
      </Cylinder>
    </group>
  );
}

/** Quantum Hazard Beacon — replaces the old 'Saturn' look with a high-tech emergency signal */
function HazardBeacon({ position, type }) {
  const meshRef = useRef();
  const ringRef = useRef();
  const beamRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 2.5;
      meshRef.current.position.y = Math.sin(t * 3.5) * 0.25;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 2;
    }
    if (beamRef.current) {
      beamRef.current.material.opacity = 0.2 + Math.sin(t * 6) * 0.15;
    }
  });

  const color = type === 'FIRE' ? '#FF3D00' : type === 'MASS_CASUALTY' ? '#ff0000' : '#FFB300';

  return (
    <group position={position}>
      {/* 1. Floating Octahedron (Core) */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* 2. Rotating High-Tech Base Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <torusGeometry args={[1.4, 0.04, 6, 6]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>

      {/* 3. Pulsing Vertical Signal Beam (Reduced height to avoid clutter) */}
      <mesh ref={beamRef} position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.05, 0.5, 3.5, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. Local illumination */}
      <pointLight intensity={8} color={color} distance={12} decay={2} />
    </group>
  );
}

/** External fire escape: vertical cage bars + per-floor platform + handrail stub */
function FireEscapeColumn({ x, z, floors }) {
  return (
    <group>
      {/* Vertical cage bars */}
      {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([bx, bz], i) => (
        <mesh key={i} position={[x + bx, (FH * floors) / 2, z + bz]}>
          <boxGeometry args={[0.08, FH * floors, 0.08]} />
          <meshStandardMaterial color="#FF3D00" />
        </mesh>
      ))}

      {/* Platform at each floor */}
      {Array.from({ length: floors }).map((_, i) => (
        <group key={i}>
          <mesh position={[x, FH * i + 0.1, z]}>
            <boxGeometry args={[1.2, 0.12, 1.2]} />
            <meshStandardMaterial color="#FF6D00" transparent opacity={0.9} />
          </mesh>
          {/* Handrail stub */}
          <mesh position={[x, FH * i + 0.6, z]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[1.0, 0.06, 0.06]} />
            <meshStandardMaterial color="#FF3D00" />
          </mesh>
        </group>
      ))}

      {/* Roof cap */}
      <mesh position={[x, FH * floors + 0.1, z]}>
        <boxGeometry args={[1.5, 0.2, 1.5]} />
        <meshStandardMaterial color="#FF3D00" />
      </mesh>
    </group>
  );
}

/** Glass elevator shaft with door panels on each floor */
function ElevatorShaft({ x, z, floors, color = '#00B0FF' }) {
  const totalHeight = FH * floors;
  return (
    <group position={[x, totalHeight / 2, z]}>
      {/* Glass box */}
      <mesh>
        <boxGeometry args={[1.5, totalHeight, 1.5]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Edge outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.55, totalHeight + 0.05, 1.55)]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
      {/* Door panel per floor */}
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[0, -totalHeight / 2 + FH * i + FH / 2, 0.76]}>
          <boxGeometry args={[0.8, 1.8, 0.05]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Staircase shaft with zigzag tread slabs.
 * isEmergency=true → fire-rated red; false → normal cyan.
 */
function StaircaseShaft({ x, z, floors, color = '#00E5FF', isEmergency = false }) {
  const totalHeight = FH * floors;
  return (
    <group>
      {/* Outer box */}
      <mesh position={[x, totalHeight / 2, z]}>
        <boxGeometry args={[2.0, totalHeight, 1.5]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isEmergency ? 0.25 : 0.12}
          wireframe={!isEmergency}
        />
      </mesh>
      {/* Tread slabs */}
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[x, FH * i + FH / 2, z]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[1.8, 0.1, 1.4]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Edge outline */}
      <lineSegments position={[x, totalHeight / 2, z]}>
        <edgesGeometry args={[new THREE.BoxGeometry(2.05, totalHeight + 0.05, 1.55)]} />
        <lineBasicMaterial color={color} transparent opacity={isEmergency ? 0.8 : 0.35} />
      </lineSegments>

      {/* Roof cap */}
      <mesh position={[x, totalHeight + 0.05, z]}>
        <boxGeometry args={[2.1, 0.15, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Ceiling-mounted router dot that pulses softly */
function RouterDot({ position }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.material.opacity = 0.5 + 0.4 * Math.sin(clock.getElapsedTime() * 2);
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 2.0, position[2]]}>
      <sphereGeometry args={[0.25, 8, 8]} />
      <meshBasicMaterial color="#00FFD0" transparent opacity={0.8} />
    </mesh>
  );
}

/** Skybridge connecting two world-space points */
function Skybridge({ start, end, color = '#00B0FF' }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const mid = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  // Correctly align the box along the vector from start to end
  const angle = Math.atan2(-dz, dx);

  return (
    <group>
      <Line points={points} color={color} lineWidth={3} />

      {/* The Bridge Slab (Walkway) */}
      <mesh position={mid} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.4, 2.5]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Edge highlight for the slab */}
      <lineSegments position={mid} rotation={[0, angle, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(length + 0.1, 0.45, 2.55)]} />
        <lineBasicMaterial color={color} transparent opacity={0.8} />
      </lineSegments>
    </group>
  );
}

/** Pulsing highlight ring + overhead spotlight for focused incidents */
function FocusHighlight({ position }) {
  const ringRef = useRef();
  const alertColor = '#ff9f00'; // Matches var(--neon-orange)

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 10) * 0.15;
      ringRef.current.scale.set(s, s, s);
      ringRef.current.material.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 10) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Animated Pulse Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.08, 16, 100]} />
        <meshStandardMaterial
          color={alertColor}
          transparent
          opacity={0.6}
          emissive={alertColor}
          emissiveIntensity={4}
        />
      </mesh>

      {/* Intense Point Light directly above */}
      <pointLight position={[0, 8, 0]} intensity={15} color="#FFEB3B" distance={40} decay={2} />

      {/* Ground Glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}>
        <circleGeometry args={[4.0, 32]} />
        <meshBasicMaterial color="#FFEB3B" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

/** Flowing directional arrow for evacuation paths */
function PathArrow({ start, end, color = "#FFEB3B" }) {
  const meshRef = useRef();

  const direction = useMemo(() => new THREE.Vector3().subVectors(end, start).normalize(), [start, end]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction), [start, end]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Medium speed constant flow (loops 0 to 1)
      const t = (clock.getElapsedTime() * 1.2) % 1;
      meshRef.current.position.lerpVectors(start, end, t);
    }
  });

  return (
    <mesh ref={meshRef} quaternion={quaternion}>
      <coneGeometry args={[0.5, 1.2, 4]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ─── Wing Components ─────────────────────────────────────────────────────────

/**
 * Main Tower — floors 0 to NUM_FLOORS_MT-1, plus roof slab.
 * Each floor has East Hall, Center, and West Hall slabs + a floor label.
 * Corner & mid-point structural pillars run the full height.
 */
function MainTower({ activeKeys, selectedNode, hoveredNode, onNodeClick, onNodeHover }) {
  return (
    <group>
      {/* Structural 8-pillar grid */}
      {[
        [-25, -15], [25, -15], [-25, 15], [25, 15],
        [-25, 0], [25, 0], [0, -15], [0, 15]
      ].map(
        ([px, pz], i) =>
          Array.from({ length: NUM_FLOORS_MT }).map((_, f) => (
            <Pillar
              key={`${i}-${f}`}
              position={[px, FH * f + FH / 2, pz]}
              height={FH}
              color="#00E5FF"
            />
          ))
      )}

      {/* Floor slabs */}
      {Array.from({ length: NUM_FLOORS_MT }, (_, f) => f).map(f => {
        const y = FH * f;
        const zones = [
          { id: `MT-${f}-EastHall`, pos: [18, y, 0], size: [14, 0.3, 24], color: "#00E5FF" },
          { id: `MT-${f}-Center`,   pos: [0, y, 0],  size: [10, 0.3, 24], color: "#651FFF" },
          { id: `MT-${f}-WestHall`, pos: [-18, y, 0], size: [14, 0.3, 24], color: "#00E5FF" }
        ];

        return (
          <group key={f}>
            {zones.map(z => (
              <FloorSlab
                key={z.id}
                position={z.pos}
                size={z.size}
                color={z.color}
                isActive={activeKeys.has(z.id)}
                isSelected={selectedNode === z.id}
                isHovered={hoveredNode === z.id}
                onHover={(h) => onNodeHover && onNodeHover(h ? z.id : null)}
                onClick={() => onNodeClick && onNodeClick(z.id)}
              />
            ))}
            {/* Back corridor strip */}
            <FloorSlab
              position={[0, y, -11.5]}
              size={[44, 0.3, 7]}
              color="#1a1a3e"
              isActive={false}
            />
            <Text
              position={[0, y + 0.5, -13]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.8}
              color="#ffffff"
              fillOpacity={0.4}
            >
              {f === 0 ? 'GROUND' : `FLOOR ${f}`}
            </Text>
          </group>
        );
      })}

      {/* Roof slab */}
      <FloorSlab
        position={[0, FH * NUM_FLOORS_MT, 0]}
        size={[50, 0.4, 30]}
        color="#00E5FF"
        isActive={false}
      />
    </group>
  );
}

/** ER Wing — 2 floors, positioned [0, 0, -40] in world space */
function ERWing({ activeKeys }) {
  return (
    <group position={[0, 0, -40]}>
      {[[-14, -10], [14, -10], [-14, 10], [14, 10]].map(([px, pz], i) =>
        Array.from({ length: NUM_FLOORS_ER }).map((_, f) => (
          <Pillar
            key={`${i}-${f}`}
            position={[px, FH * f + FH / 2, pz]}
            height={FH}
            color="#FF6600"
          />
        ))
      )}
      {Array.from({ length: NUM_FLOORS_ER }, (_, f) => f).map(f => (
        <group key={f}>
          <FloorSlab
            position={[0, FH * f, 0]}
            size={[28, 0.4, 20]}
            color="#FF6600"
            opacity={0.2}
            isActive={activeKeys.has(`ER-${f}-Triage`)}
          />
          <Text
            position={[0, FH * f + 0.5, -9]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1.4}
            color="#FF6600"
            fillOpacity={0.5}
          >
            {f === 0 ? 'ER GROUND' : 'ER FLOOR 1'}
          </Text>
        </group>
      ))}
      {/* Roof slab */}
      <FloorSlab
        position={[0, FH * NUM_FLOORS_ER, 0]}
        size={[28, 0.4, 20]}
        color="#FF6600"
        isActive={false}
      />
    </group>
  );
}

/** ICU Wing — 4 floors (1–4), positioned [50, 0, 0] in world space */
function ICUWing({ activeKeys }) {
  return (
    <group position={[50, 0, 0]}>
      {[[-10, -8], [10, -8], [-10, 8], [10, 8]].map(([px, pz], i) =>
        Array.from({ length: NUM_FLOORS_ICU + 1 }).map((_, f) => (
          <Pillar
            key={`${i}-${f}`}
            position={[px, FH * f + FH / 2, pz]}
            height={FH}
            color="#00FF94"
          />
        ))
      )}
      {Array.from({ length: NUM_FLOORS_ICU }, (_, i) => i + 1).map(f => (
        <group key={f}>
          <FloorSlab
            position={[0, FH * f, 0]}
            size={[20, 0.3, 16]}
            color="#00FF94"
            isActive={activeKeys.has(`ICU-${f}-Central`)}
          />
          <Text
            position={[0, FH * f + 0.5, -7]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1.3}
            color="#00FF94"
            fillOpacity={0.5}
          >
            {`ICU F${f}`}
          </Text>
        </group>
      ))}
      {/* Roof slab */}
      <FloorSlab
        position={[0, FH * (NUM_FLOORS_ICU + 1), 0]}
        size={[20, 0.3, 16]}
        color="#00FF94"
        isActive={false}
      />
    </group>
  );
}

/** OPD Wing — 2 floors, positioned [-45, 0, 0] in world space */
function OPDWing({ activeKeys }) {
  return (
    <group position={[-45, 0, 0]}>
      {[[-9, -7], [9, -7], [-9, 7], [9, 7]].map(([px, pz], i) =>
        Array.from({ length: NUM_FLOORS_OPD }).map((_, f) => (
          <Pillar
            key={`${i}-${f}`}
            position={[px, FH * f + FH / 2, pz]}
            height={FH}
            color="#AA00FF"
          />
        ))
      )}
      {Array.from({ length: NUM_FLOORS_OPD }, (_, f) => f).map(f => (
        <group key={f}>
          <FloorSlab
            position={[0, FH * f, 0]}
            size={[18, 0.3, 14]}
            color="#AA00FF"
            isActive={activeKeys.has(`OPD-${f}-Reception`)}
          />
          <Text
            position={[0, FH * f + 0.5, -6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1.3}
            color="#AA00FF"
            fillOpacity={0.5}
          >
            {`OPD F${f}`}
          </Text>
        </group>
      ))}
      {/* Roof slab */}
      <FloorSlab
        position={[0, FH * NUM_FLOORS_OPD, 0]}
        size={[18, 0.3, 14]}
        color="#AA00FF"
        isActive={false}
      />
    </group>
  );
}

// ─── Public Export ────────────────────────────────────────────────────────────

/**
 * BuildingModel
 *
 * Props:
 *   activeIncidents  – array of Firestore incident objects (status=ACTIVE)
 *   evacuationRoute  – ordered array of graph node IDs representing the Dijkstra path
 *   multiPaths       – optional array of path objects { id, path, color, label }
 *   recentIncident   – the newest incident to focus on
 *   highlightActive  – boolean to trigger the temporary focus effect
 */
<<<<<<< HEAD
export function BuildingModel({ 
  activeIncidents = [], 
  evacuationRoute = [], 
  recentIncident = null, 
  highlightActive = false,
  selectedNode = null,
  hoveredNode = null,
  onNodeClick,
  onNodeHover
=======
export function BuildingModel({
  activeIncidents = [],
  evacuationRoute = [],
  multiPaths = [],
  recentIncident = null,
  highlightActive = false
>>>>>>> origin/main
}) {
  // Build a Set of "active keys" derived from incident location data.
  // Keys match the pattern used in FloorSlab isActive checks: "<wing>-<floor>-<zone>".
  const activeKeys = useMemo(() => {
    const set = new Set();
    activeIncidents.forEach(inc => {
      // Primary location
      const raw = inc.location?.zone?.replace(/\s+/g, '');
      const key = `${inc.location?.floor}-${raw}`;
      if (key) set.add(key);
      if (raw) set.add(raw);
      if (inc.location?.nodeId) set.add(inc.location.nodeId);

      // Escalated locations
      if (Array.isArray(inc.affected_nodes)) {
        inc.affected_nodes.forEach(nodeId => set.add(nodeId));
      }
    });
    return set;
  }, [activeIncidents]);

  // Convert single route node IDs → THREE.Vector3 array (fallback)
  const pathPoints = useMemo(() => {
    if (!evacuationRoute || evacuationRoute.length < 2) return [];
    return evacuationRoute
      .map(node => {
        const c = zoneCoordinates3D[node];
        return c ? new THREE.Vector3(c[0], c[1] + 0.8, c[2]) : null;
      })
      .filter(Boolean);
  }, [evacuationRoute]);

  // Convert multiPaths → list of THREE.Vector3 arrays
  const processedMultiPaths = useMemo(() => {
    if (!multiPaths || multiPaths.length === 0) return [];
    return multiPaths.map(occ => ({
      ...occ,
      points: occ.path.map(node => {
        const c = zoneCoordinates3D[node];
        return c ? new THREE.Vector3(c[0], c[1] + 0.8, c[2]) : null;
      }).filter(Boolean)
    })).filter(p => p.points.length > 1);
  }, [multiPaths]);

  // Derive world-space positions for hazard beacons.
  const hazardPositions = useMemo(() => {
    const beacons = [];
    activeIncidents.forEach(inc => {
      const affected = [inc.location?.nodeId, ...(inc.affected_nodes || [])].filter(Boolean);
      affected.forEach(nodeId => {
        const c = zoneCoordinates3D[nodeId];
        if (c) {
          beacons.push({ position: [c[0], c[1] + 1.5, c[2]], type: inc.event_type });
        }
      });
    });
    return beacons;
  }, [activeIncidents]);

  // Derive focus highlight position
  const focusPosition = useMemo(() => {
    if (!recentIncident || !highlightActive) return null;
    const raw = recentIncident.location.zone?.replace(/\s+/g, '');
    const key = `${recentIncident.location.floor}-${raw}`;
    const c = zoneCoordinates3D[key] || zoneCoordinates3D[raw] || zoneCoordinates3D[recentIncident.location.nodeId];
    return c ? [c[0], c[1] + 1.2, c[2]] : null;
  }, [recentIncident, highlightActive]);

  return (
    <group>
      {/* Ground grid - more subtle */}
      <gridHelper args={[300, 60, '#1A237E', '#050510']} position={[0, -0.1, 0]} />

      {/* ── Assembly areas ─────────────────────────────────────────────── */}
      {/* Primary (front) */}
      <mesh position={[0, 0, 35]}>
        <cylinderGeometry args={[8, 8, 0.2, 32]} />
        <meshBasicMaterial color="#00E676" transparent opacity={0.35} />
      </mesh>
      <Text
        position={[0, 0.3, 35]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2.0}
        color="#00E676"
      >
        PRIMARY ASSEMBLY ZONE
      </Text>

      {/* Rear assembly */}
      <mesh position={[0, 0, -65]}>
        <cylinderGeometry args={[6, 6, 0.2, 32]} />
        <meshBasicMaterial color="#69FF47" transparent opacity={0.35} />
      </mesh>
      <Text
        position={[0, 0.3, -65]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.8}
        color="#69FF47"
      >
        REAR ASSEMBLY ZONE
      </Text>

      {/* ── Roof helipad ───────────────────────────────────────────────── */}
      <mesh position={[0, FH * NUM_FLOORS_MT + 0.5, 0]}>
        <cylinderGeometry args={[5, 5, 0.3, 32]} />
        <meshBasicMaterial color="#FFEA00" transparent opacity={0.5} />
      </mesh>
      <Text
        position={[0, FH * NUM_FLOORS_MT + 1.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color="#FFEA00"
      >
        MEDEVAC HELIPAD
      </Text>

      {/* ── Building wings ─────────────────────────────────────────────── */}
<<<<<<< HEAD
      <MainTower 
        activeKeys={activeKeys} 
        selectedNode={selectedNode} hoveredNode={hoveredNode} 
        onNodeClick={onNodeClick} onNodeHover={onNodeHover} 
      />
      <ERWing    activeKeys={activeKeys} />
      <ICUWing   activeKeys={activeKeys} />
      <OPDWing   activeKeys={activeKeys} />
=======
      <MainTower activeKeys={activeKeys} />
      <ERWing activeKeys={activeKeys} />
      <ICUWing activeKeys={activeKeys} />
      <OPDWing activeKeys={activeKeys} />
>>>>>>> origin/main

      {/* ── Staircase shafts (Main Tower) ──────────────────────────────── */}
      {/* Fire-rated (C & D - inner core) */}
      <StaircaseShaft x={8} z={-7.5} floors={NUM_FLOORS_MT} color="#FF3D00" isEmergency={true} />
      <StaircaseShaft x={-8} z={-7.5} floors={NUM_FLOORS_MT} color="#FF3D00" isEmergency={true} />
      {/* Normal stairs (A & B - back row) */}
      <StaircaseShaft x={20} z={-14.5} floors={NUM_FLOORS_MT} color="#00E5FF" isEmergency={false} />
      <StaircaseShaft x={-20} z={-14.5} floors={NUM_FLOORS_MT} color="#00E5FF" isEmergency={false} />

      {/* ── Staircase shafts (Other Wings) ─────────────────────────────── */}
      <StaircaseShaft x={57} z={-7.2} floors={NUM_FLOORS_ICU} color="#00FF94" isEmergency={false} />
      <StaircaseShaft x={13} z={-47} floors={NUM_FLOORS_ER} color="#FF6600" isEmergency={false} />
      <StaircaseShaft x={-51.5} z={-6.2} floors={NUM_FLOORS_OPD} color="#FFB300" isEmergency={false} />

      {/* ── Elevator shafts ─────────────────────────────────────────────── */}
      <ElevatorShaft x={10} z={-14.5} floors={NUM_FLOORS_MT} color="#00B0FF" />
      <ElevatorShaft x={-10} z={-14.5} floors={NUM_FLOORS_MT} color="#00B0FF" />

      {/* ── External fire escapes ──────────────────────────────────────── */}
      {/* Positioned at centered east/west outer edges */}
      <FireEscapeColumn x={25.8} z={0} floors={NUM_FLOORS_MT} />
      <FireEscapeColumn x={-25.8} z={0} floors={NUM_FLOORS_MT} />

      {/* ── Skybridges ─────────────────────────────────────────────────── */}
      {/* MT ↔ ICU (extended to meet new edge) */}
      <Skybridge start={[25, FH * 1, 0]} end={[41, FH * 1, 0]} color="#00FF94" />
      <Skybridge start={[25, FH * 2, 0]} end={[41, FH * 2, 0]} color="#00FF94" />
      <Skybridge start={[25, FH * 3, 0]} end={[41, FH * 3, 0]} color="#00FF94" />
      {/* MT ↔ OPD (extended to meet new edge) */}
      <Skybridge start={[-25, FH * 1, 0]} end={[-37, FH * 1, 0]} color="#AA00FF" />
      {/* MT ↔ ER (extended to meet new edge) */}
      <Skybridge start={[0, FH * 1, -15]} end={[0, FH * 1, -31]} color="#FF6600" />


      {/* ── Evacuation route paths ──────────────────────────────────────── */}

      {/* 1. Multi-Occupant Paths (Scenario Mode) */}
      {processedMultiPaths.map((p, idx) => (
        <group key={`multi-path-${p.id || idx}`}>
          <Line points={p.points} color={p.color} lineWidth={6} />
          {p.points.map((pt, i) => (
            <group key={`pt-${i}`}>
              <Sphere args={[0.35, 8, 8]} position={pt}>
                <meshBasicMaterial color={p.color} />
              </Sphere>
              {i < p.points.length - 1 && (
                <PathArrow start={pt} end={p.points[i + 1]} color={p.color} />
              )}
            </group>
          ))}
        </group>
      ))}

      {/* 2. Legacy Fallback Path (Standard Mode) */}
      {processedMultiPaths.length === 0 && pathPoints.length > 1 && (
        <group key="legacy-path">
          <Line points={pathPoints} color="#00ff9f" lineWidth={6} />
          {pathPoints.map((pt, i) => (
            <group key={`legacy-pt-${i}`}>
              <Sphere args={[0.35, 8, 8]} position={pt}>
                <meshBasicMaterial color="#00ff9f" />
              </Sphere>
              {i < pathPoints.length - 1 && (
                <PathArrow start={pt} end={pathPoints[i + 1]} />
              )}
            </group>
          ))}
        </group>
      )}

      {/* ── Hazard beacons ─────────────────────────────────────────────── */}
      {hazardPositions.map((h, i) => (
        <HazardBeacon key={i} position={h.position} type={h.type} />
      ))}

      {/* ── Focus Highlight ────────────────────────────────────────────── */}
      {focusPosition && (
        <FocusHighlight position={focusPosition} />
      )}
    </group>
  );
}
