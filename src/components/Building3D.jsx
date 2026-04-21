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
const NUM_FLOORS_MT  = 6; // Main Tower: floors 0–5 + roof slab
const NUM_FLOORS_ER  = 2; // ER Wing: floors 0–1
const NUM_FLOORS_ICU = 4; // ICU Wing: floors 1–4
const NUM_FLOORS_OPD = 2; // OPD Wing: floors 0–1

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * A single floor slab with edge outline.
 * When isActive=true the slab lights up in danger-red.
 */
function FloorSlab({ position, size, color = '#00E5FF', opacity = 0.12, wireframe = true, isActive }) {
  const [w, h, d] = size;
  const finalColor   = isActive ? '#FF3D00' : color;
  const finalOpacity = isActive ? 0.75      : opacity;

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={finalColor}
          transparent
          opacity={finalOpacity}
          wireframe={wireframe && !isActive}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w + 0.05, h + 0.05, d + 0.05)]} />
        <lineBasicMaterial
          color={isActive ? '#FF6D00' : color}
          transparent
          opacity={isActive ? 0.9 : 0.35}
        />
      </lineSegments>
    </group>
  );
}

/** Structural glowing pillar / column */
function Pillar({ position, height = FH, radius = 0.18, color = '#0044ff' }) {
  return (
    <Cylinder args={[radius, radius, height, 6]} position={position}>
      <meshStandardMaterial color={color} transparent opacity={0.4} />
    </Cylinder>
  );
}

/** Pulsing hazard beacon — scales & changes opacity over time */
function HazardBeacon({ position, type }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + 0.2 * Math.sin(clock.getElapsedTime() * 4));
    }
  });

  const color = type === 'FIRE' ? '#FF3D00' : '#FFB300';

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.7, 16, 16]}>
        <meshBasicMaterial color={color} />
      </Sphere>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.1, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
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
  const mid    = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx     = end[0] - start[0];
  const dz     = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle  = Math.atan2(dx, dz);

  return (
    <group>
      <Line points={points} color={color} lineWidth={3} />
      <mesh position={mid} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.5, 2.5]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} />
      </mesh>
      <lineSegments position={mid} rotation={[0, angle, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(length + 0.05, 0.55, 2.55)]} />
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

// ─── Wing Components ─────────────────────────────────────────────────────────

/**
 * Main Tower — floors 0 to NUM_FLOORS_MT-1, plus roof slab.
 * Each floor has East Hall, Center, and West Hall slabs + a floor label.
 * Corner & mid-point structural pillars run the full height.
 */
function MainTower({ activeKeys }) {
  return (
    <group>
      {/* Structural corner + mid pillars */}
      {[[-22, -12], [22, -12], [-22, 12], [22, 12], [-22, 0], [22, 0], [0, -12], [0, 12]].map(
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
        return (
          <group key={f}>
            <FloorSlab
              position={[18, y, 0]}
              size={[14, 0.4, 24]}
              color="#00E5FF"
              opacity={0.12}
              isActive={activeKeys.has(`MT-${f}-EastHall`)}
            />
            <FloorSlab
              position={[0, y, 0]}
              size={[10, 0.4, 24]}
              color="#651FFF"
              opacity={0.18}
              isActive={activeKeys.has(`MT-${f}-Center`)}
            />
            <FloorSlab
              position={[-18, y, 0]}
              size={[14, 0.4, 24]}
              color="#00E5FF"
              opacity={0.12}
              isActive={activeKeys.has(`MT-${f}-WestHall`)}
            />
            {/* Back corridor strip */}
            <FloorSlab
              position={[0, y, -10]}
              size={[44, 0.4, 6]}
              color="#1a1a3e"
              opacity={0.15}
              isActive={false}
            />
            <Text
              position={[0, y + 0.5, -13]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              color="#ffffff"
              fillOpacity={0.25}
            >
              {f === 0 ? 'GROUND' : `FLOOR ${f}`}
            </Text>
          </group>
        );
      })}

      {/* Roof slab */}
      <FloorSlab
        position={[0, FH * NUM_FLOORS_MT, 0]}
        size={[50, 0.6, 30]}
        color="#00E5FF"
        opacity={0.22}
        wireframe={false}
      />
    </group>
  );
}

/** ER Wing — 2 floors, positioned [0, 0, -40] in world space */
function ERWing({ activeKeys }) {
  return (
    <group position={[0, 0, -40]}>
      {[[-12, -8], [12, -8], [-12, 8], [12, 8]].map(([px, pz], i) =>
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
            fontSize={1.0}
            color="#FF6600"
            fillOpacity={0.35}
          >
            {f === 0 ? 'ER GROUND' : 'ER FLOOR 1'}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** ICU Wing — 4 floors (1–4), positioned [50, 0, 0] in world space */
function ICUWing({ activeKeys }) {
  return (
    <group position={[50, 0, 0]}>
      {[[-8, -6], [8, -6], [-8, 6], [8, 6]].map(([px, pz], i) =>
        Array.from({ length: NUM_FLOORS_ICU }).map((_, f) => (
          <Pillar
            key={`${i}-${f}`}
            position={[px, FH * (f + 1) + FH / 2, pz]}
            height={FH}
            color="#00FF94"
          />
        ))
      )}
      {Array.from({ length: NUM_FLOORS_ICU }, (_, i) => i + 1).map(f => (
        <group key={f}>
          <FloorSlab
            position={[0, FH * f, 0]}
            size={[20, 0.4, 16]}
            color="#00FF94"
            opacity={0.18}
            isActive={activeKeys.has(`ICU-${f}-Central`)}
          />
          <Text
            position={[0, FH * f + 0.5, -7]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.9}
            color="#00FF94"
            fillOpacity={0.3}
          >
            {`ICU F${f}`}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** OPD Wing — 2 floors, positioned [-45, 0, 0] in world space */
function OPDWing({ activeKeys }) {
  return (
    <group position={[-45, 0, 0]}>
      {[[-7, -5], [7, -5], [-7, 5], [7, 5]].map(([px, pz], i) =>
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
            size={[18, 0.4, 14]}
            color="#AA00FF"
            opacity={0.18}
            isActive={activeKeys.has(`OPD-${f}-Reception`)}
          />
          <Text
            position={[0, FH * f + 0.5, -6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.9}
            color="#AA00FF"
            fillOpacity={0.3}
          >
            {`OPD F${f}`}
          </Text>
        </group>
      ))}
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
 */
export function BuildingModel({ activeIncidents, evacuationRoute }) {
  // Build a Set of "active keys" derived from incident location data.
  // Keys match the pattern used in FloorSlab isActive checks: "<wing>-<floor>-<zone>".
  const activeKeys = useMemo(() => {
    const set = new Set();
    activeIncidents.forEach(inc => {
      const raw = inc.location.zone?.replace(/\s+/g, '');
      const key = `${inc.location.floor}-${raw}`;
      set.add(key);
      set.add(raw || '');
    });
    return set;
  }, [activeIncidents]);

  // Convert route node IDs → THREE.Vector3 array for rendering.
  const pathPoints = useMemo(() => {
    if (!evacuationRoute || evacuationRoute.length < 2) return [];
    return evacuationRoute
      .map(node => {
        const c = zoneCoordinates3D[node];
        return c ? new THREE.Vector3(c[0], c[1] + 0.8, c[2]) : null;
      })
      .filter(Boolean);
  }, [evacuationRoute]);

  // Derive world-space positions for hazard beacons.
  const hazardPositions = useMemo(() => {
    return activeIncidents
      .map(inc => {
        const raw = inc.location.zone?.replace(/\s+/g, '');
        const key = `${inc.location.floor}-${raw}`;
        const c   = zoneCoordinates3D[key] || zoneCoordinates3D[raw];
        return c ? { position: [c[0], c[1] + 1.5, c[2]], type: inc.event_type } : null;
      })
      .filter(Boolean);
  }, [activeIncidents]);

  return (
    <group>
      {/* Ground grid */}
      <gridHelper args={[200, 100, '#00E5FF', '#0a0a1a']} position={[0, -0.1, 0]} />

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
      <mesh position={[0, FH * NUM_FLOORS_MT + 0.5, -15]}>
        <cylinderGeometry args={[5, 5, 0.3, 32]} />
        <meshBasicMaterial color="#FFEA00" transparent opacity={0.5} />
      </mesh>
      <Text
        position={[0, FH * NUM_FLOORS_MT + 1.2, -15]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color="#FFEA00"
      >
        MEDEVAC HELIPAD
      </Text>

      {/* ── Building wings ─────────────────────────────────────────────── */}
      <MainTower activeKeys={activeKeys} />
      <ERWing    activeKeys={activeKeys} />
      <ICUWing   activeKeys={activeKeys} />
      <OPDWing   activeKeys={activeKeys} />

      {/* ── Staircase shafts (Main Tower) ──────────────────────────────── */}
      {/* Fire-rated (eastern & western fire stairs) */}
      <StaircaseShaft x={22}  z={10}  floors={NUM_FLOORS_MT} color="#FF3D00" isEmergency={true} />
      <StaircaseShaft x={-22} z={10}  floors={NUM_FLOORS_MT} color="#FF3D00" isEmergency={true} />
      {/* Normal stairs */}
      <StaircaseShaft x={22}  z={-10} floors={NUM_FLOORS_MT} color="#00E5FF" isEmergency={false} />
      <StaircaseShaft x={-22} z={-10} floors={NUM_FLOORS_MT} color="#00E5FF" isEmergency={false} />

      {/* ── Elevator shafts ─────────────────────────────────────────────── */}
      <ElevatorShaft x={10}  z={-12} floors={NUM_FLOORS_MT} color="#00B0FF" />
      <ElevatorShaft x={-10} z={-12} floors={NUM_FLOORS_MT} color="#00B0FF" />

      {/* ── External fire escapes ──────────────────────────────────────── */}
      <FireEscapeColumn x={30}  z={0} floors={NUM_FLOORS_MT} />
      <FireEscapeColumn x={-30} z={0} floors={NUM_FLOORS_MT} />

      {/* ── Skybridges ─────────────────────────────────────────────────── */}
      {/* MT ↔ ICU (3 levels) */}
      <Skybridge start={[25, FH * 1, 0]} end={[45, FH * 1, 0]} color="#00FF94" />
      <Skybridge start={[25, FH * 2, 0]} end={[45, FH * 2, 0]} color="#00FF94" />
      <Skybridge start={[25, FH * 3, 0]} end={[45, FH * 3, 0]} color="#00FF94" />
      {/* MT ↔ OPD */}
      <Skybridge start={[-25, FH * 1, 0]} end={[-40, FH * 1, 0]} color="#AA00FF" />
      {/* MT ↔ ER */}
      <Skybridge start={[0, FH * 1, -15]} end={[0, FH * 1, -32]} color="#FF6600" />

      {/* ── Router dots (derived from graph) ───────────────────────────── */}
      {Object.entries(zoneCoordinates3D)
        .filter(([id]) => id.includes('Router'))
        .map(([id, coords]) => (
          <RouterDot key={id} position={coords} />
        ))}

      {/* ── Evacuation route path ───────────────────────────────────────── */}
      {pathPoints.length > 1 && (
        <>
          <Line points={pathPoints} color="#00E676" lineWidth={6} />
          {pathPoints.map((pt, i) => (
            <Sphere key={i} args={[0.35, 8, 8]} position={pt}>
              <meshBasicMaterial color="#00E676" />
            </Sphere>
          ))}
        </>
      )}

      {/* ── Hazard beacons ─────────────────────────────────────────────── */}
      {hazardPositions.map((h, i) => (
        <HazardBeacon key={i} position={h.position} type={h.type} />
      ))}
    </group>
  );
}
