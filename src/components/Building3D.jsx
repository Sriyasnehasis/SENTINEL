import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Line, 
  Text, 
  Sphere, 
  Cylinder, 
  Box, 
  MeshReflectorMaterial,
  Sparkles,
  Float,
  Billboard,
  Trail,
  Grid
} from '@react-three/drei';
import * as THREE from 'three';
import { zoneCoordinates3D } from '../utils/buildingGraph';

// ─────────────────────────────────────────────────────
// Configuration & Constants
// ─────────────────────────────────────────────────────

const FLOOR_HEIGHT = 3.5;
const NUM_FLOORS_MT = 6;
const NUM_FLOORS_EA = 4;
const NUM_FLOORS_WA = 5;

const COLORS = {
  primary: '#00E5FF',
  secondary: '#651FFF',
  accent: '#AA00FF',
  danger: '#FF3D00',
  warning: '#FFB300',
  safe: '#00E676',
  glass: '#FFFFFF',
  dark: '#0A0E1A'
};

// ─────────────────────────────────────────────────────
// Advanced Visual Components
// ─────────────────────────────────────────────────────

/** Animated floor slab with holographic effect */
function HolographicFloor({ position, size, color, isActive, opacity = 0.15 }) {
  const meshRef = useRef();
  const glowRef = useRef();
  
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.3 + 0.15 * Math.sin(clock.getElapsedTime() * 2);
    }
    if (isActive && meshRef.current) {
      meshRef.current.scale.setScalar(1 + 0.02 * Math.sin(clock.getElapsedTime() * 3));
    }
  });

  const [w, h, d] = size;
  const finalColor = isActive ? COLORS.danger : color;
  const finalOpacity = isActive ? 0.85 : opacity;

  return (
    <group position={position}>
      {/* Main floor slab */}
      <mesh ref={meshRef}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial 
          color={finalColor} 
          transparent 
          opacity={finalOpacity} 
          wireframe={!isActive}
          metalness={0.8}
          roughness={0.2}
          emissive={finalColor}
          emissiveIntensity={isActive ? 0.5 : 0.1}
        />
      </mesh>
      
      {/* Holographic glow layer */}
      <mesh ref={glowRef} scale={[1.02, 1.02, 1.02]}>
        <boxGeometry args={[w, h * 0.1, d]} />
        <meshBasicMaterial 
          color={finalColor} 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w + 0.05, h + 0.05, d + 0.05)]} />
        <lineBasicMaterial 
          color={isActive ? '#FF6D00' : color} 
          transparent 
          opacity={isActive ? 0.9 : 0.4}
          linewidth={isActive ? 3 : 1.5}
        />
      </lineSegments>

      {/* Active zone particles */}
      {isActive && (
        <Sparkles 
          count={50} 
          scale={[w + 1, 1, d + 1]} 
          size={4} 
          speed={2} 
          color={COLORS.danger}
          position={[0, 0.5, 0]}
        />
      )}
    </group>
  );
}

/** Futuristic pillar with energy core */
function EnergyPillar({ position, height = FLOOR_HEIGHT, radius = 0.2, color = COLORS.primary }) {
  const coreRef = useRef();
  const outerRef = useRef();

  useFrame(({ clock }) => {
    if (coreRef.current) {
      coreRef.current.rotation.y = clock.getElapsedTime() * 0.5;
      coreRef.current.scale.y = 1 + 0.1 * Math.sin(clock.getElapsedTime() * 2);
    }
    if (outerRef.current) {
      outerRef.current.material.opacity = 0.3 + 0.1 * Math.sin(clock.getElapsedTime() * 1.5);
    }
  });

  return (
    <group position={position}>
      {/* Outer glass shell */}
      <Cylinder ref={outerRef} args={[radius, radius, height, 8]}>
        <meshPhysicalMaterial 
          color={color} 
          transparent 
          opacity={0.25} 
          transmission={0.9}
          thickness={0.5}
          roughness={0.1}
          metalness={0.8}
        />
      </Cylinder>

      {/* Inner energy core */}
      <Cylinder ref={coreRef} args={[radius * 0.4, radius * 0.4, height * 0.9, 6]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </Cylinder>

      {/* Top cap */}
      <Sphere position={[0, height / 2, 0]} args={[radius * 1.2, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={1.5}
        />
      </Sphere>

      {/* Bottom cap */}
      <Sphere position={[0, -height / 2, 0]} args={[radius * 1.2, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={1.5}
        />
      </Sphere>
    </group>
  );
}

/** Pulsing hazard beacon with volumetric glow */
function HazardBeacon({ position, type }) {
  const beaconRef = useRef();
  const ringRef = useRef();
  const lightRef = useRef();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(1 + 0.25 * Math.sin(time * 4));
      beaconRef.current.rotation.y = time * 0.8;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -time * 1.2;
      ringRef.current.material.opacity = 0.5 + 0.3 * Math.sin(time * 3);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(time * 4);
    }
  });

  const color = type === "FIRE" ? COLORS.danger : COLORS.warning;
  const isFire = type === "FIRE";

  return (
    <group position={position}>
      {/* Central beacon sphere */}
      <Float speed={3} rotationIntensity={0.5} floatIntensity={0.3}>
        <Sphere ref={beaconRef} args={[0.6, 32, 32]}>
          <meshStandardMaterial 
            color={color} 
            emissive={color}
            emissiveIntensity={3}
            toneMapped={false}
          />
        </Sphere>
        {/* Outer glow ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <torusGeometry args={[1.2, 0.08, 16, 32]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
        </mesh>
      </Float>

      {/* Rotating warning ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.1, 16, 48]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={2}
          transparent 
          opacity={0.7}
        />
      </mesh>

      {/* Secondary ring */}
      <mesh rotation={[Math.PI / 2.5, Math.PI / 4, 0]}>
        <torusGeometry args={[1.6, 0.05, 16, 48]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={1.5}
          transparent 
          opacity={0.4}
        />
      </mesh>

      {/* Dynamic point light */}
      <pointLight 
        ref={lightRef}
        color={color} 
        intensity={3} 
        distance={8} 
        decay={2}
      />

      {/* Particle trail */}
      <Trail 
        width={1.5} 
        length={4} 
        color={color} 
        attenuation={(t) => t * t}
      >
        <Sphere args={[0.15, 16, 16]}>
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </Sphere>
      </Trail>

      {/* Ground projection */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
        <ringGeometry args={[0.5, 2, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** External fire escape with animated lights */
function FireEscapeColumn({ x, z, floors }) {
  return (
    <group>
      {Array.from({ length: floors }).map((_, i) => (
        <group key={i} position={[x, FLOOR_HEIGHT * i + FLOOR_HEIGHT / 2, z]}>
          <EnergyPillar height={FLOOR_HEIGHT} radius={0.3} color={COLORS.danger} />
          {/* Platform with grid pattern */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[2.5, 2.5, 0.2, 8]} />
            <meshStandardMaterial 
              color={COLORS.danger} 
              metalness={0.9} 
              roughness={0.3}
              wireframe
            />
          </mesh>
          {/* Warning lights */}
          <Sparkles 
            count={8} 
            scale={[5, 0.5, 5]} 
            size={3} 
            speed={1} 
            color={COLORS.danger}
          />
        </group>
      ))}
    </group>
  );
}

/** Glowing skybridge with energy flow */
function Skybridge({ start, end, color = COLORS.primary }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const mid = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <group>
      {/* Main bridge structure */}
      <Line points={points} color={color} lineWidth={4} />
      
      {/* Glass walkway */}
      <mesh position={mid} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.3, 3]} />
        <meshPhysicalMaterial 
          color={color} 
          transparent 
          opacity={0.15} 
          transmission={0.95}
          thickness={0.3}
          roughness={0.05}
          metalness={0.9}
        />
      </mesh>

      {/* Energy flow lines */}
      <Line 
        points={[
          new THREE.Vector3(start[0], start[1] + 0.5, start[2]),
          new THREE.Vector3(end[0], end[1] + 0.5, end[2])
        ]} 
        color="#FFFFFF" 
        lineWidth={2} 
        dashed 
        dashSize={0.5} 
        gapSize={0.3}
      />

      {/* Side railings */}
      <mesh position={mid} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.8, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={mid} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.8, -0.1]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Support cables */}
      <Line 
        points={[
          new THREE.Vector3(start[0], start[1] + 2, start[2]),
          new THREE.Vector3(mid[0], mid[1] + 0.5, mid[2])
        ]} 
        color={color} 
        lineWidth={1} 
        opacity={0.4} 
        transparent
      />
      <Line 
        points={[
          new THREE.Vector3(end[0], end[1] + 2, end[2]),
          new THREE.Vector3(mid[0], mid[1] + 0.5, mid[2])
        ]} 
        color={color} 
        lineWidth={1} 
        opacity={0.4} 
        transparent
      />
    </group>
  );
}

/** Animated evacuation route path */
function EvacuationRoute({ points }) {
  const groupRef = useRef();
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child.material) {
          child.material.opacity = 0.6 + 0.4 * Math.sin(clock.getElapsedTime() * 2 + i * 0.5);
        }
      });
    }
  });

  if (points.length < 2) return null;

  return (
    <group ref={groupRef}>
      {/* Main path line */}
      <Line points={points} color={COLORS.safe} lineWidth={8} />
      
      {/* Animated path segments */}
      {points.slice(0, -1).map((start, i) => {
        const end = points[i + 1];
        return (
          <Line 
            key={i}
            points={[start, end]} 
            color={COLORS.safe} 
            lineWidth={6} 
            dashed 
            dashSize={0.8} 
            gapSize={0.4}
            opacity={0.8}
            transparent
          />
        );
      })}

      {/* Waypoint spheres with glow */}
      {points.map((pt, i) => (
        <group key={i} position={pt}>
          <Sphere args={[0.3, 24, 24]}>
            <meshStandardMaterial 
              color={COLORS.safe} 
              emissive={COLORS.safe}
              emissiveIntensity={2}
            />
          </Sphere>
          <Sparkles 
            count={15} 
            scale={[1.5, 1.5, 1.5]} 
            size={5} 
            speed={3} 
            color={COLORS.safe}
          />
          <Billboard>
            <Text 
              position={[0, 0.8, 0]} 
              fontSize={0.4} 
              color={COLORS.safe}
              anchorX="center" 
              anchorY="middle"
            >
              {i + 1}
            </Text>
          </Billboard>
        </group>
      ))}

      {/* Path glow underneath */}
      <Line points={points} color={COLORS.safe} lineWidth={12} opacity={0.2} transparent />
    </group>
  );
}

// ─────────────────────────────────────────────────────
// Building Sections
// ─────────────────────────────────────────────────────

function MainTower({ activeKeys }) {
  const floors = Array.from({ length: NUM_FLOORS_MT }, (_, i) => i + 1);

  return (
    <group>
      {/* Corner pillars with energy cores */}
      {[[-5, -4], [5, -4], [-5, 4], [5, 4]].map(([x, z], i) => (
        <group key={`corner-${i}`}>
          {Array.from({ length: NUM_FLOORS_MT }).map((_, f) => (
            <EnergyPillar 
              key={`${i}-${f}`} 
              position={[x, FLOOR_HEIGHT * f + FLOOR_HEIGHT / 2, z]} 
              height={FLOOR_HEIGHT} 
              color={COLORS.primary} 
            />
          ))}
        </group>
      ))}

      {/* Floor slabs */}
      {floors.map(f => {
        const y = FLOOR_HEIGHT * f;
        const eKey = `MT-${f}-EastHall`;
        const cKey = `MT-${f}-Center`;
        const wKey = `MT-${f}-WestHall`;
        
        return (
          <group key={f}>
            {/* East Hall */}
            <HolographicFloor 
              position={[6, y, 0]} 
              size={[5, 0.3, 7]} 
              color={COLORS.primary} 
              isActive={activeKeys.has(eKey)} 
            />
            
            {/* Center Core */}
            <HolographicFloor 
              position={[0, y, 0]} 
              size={[4, 0.4, 7]} 
              color={COLORS.secondary} 
              isActive={activeKeys.has(cKey)} 
            />
            
            {/* West Hall */}
            <HolographicFloor 
              position={[-6, y, 0]} 
              size={[5, 0.3, 7]} 
              color={COLORS.primary} 
              isActive={activeKeys.has(wKey)} 
            />

            {/* Floor number label */}
            <Billboard position={[0, y + 1, -4]}>
              <Text 
                rotation={[-Math.PI / 2, 0, 0]} 
                fontSize={0.6} 
                color="#FFFFFF" 
                fillOpacity={0.8}
                
              >
                F{f}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* Roof with helipad */}
      <group position={[0, FLOOR_HEIGHT * (NUM_FLOORS_MT + 1), 0]}>
        <mesh>
          <cylinderGeometry args={[8, 8, 0.5, 32]} />
          <meshStandardMaterial 
            color={COLORS.primary} 
            metalness={0.9} 
            roughness={0.1}
          />
        </mesh>
        {/* Helipad marking */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
          <ringGeometry args={[3, 3.5, 32]} />
          <meshBasicMaterial color="#FFEA00" />
        </mesh>
        <Text 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.4, 0]} 
          fontSize={2} 
          color="#FFEA00"
          
        >
          H
        </Text>
      </group>
    </group>
  );
}

function EastAnnex({ activeKeys }) {
  const W = 5, D = 7;
  
  return (
    <group position={[14, 0, 0]}>
      {/* Corner pillars */}
      {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z], i) => (
        <group key={`ea-corner-${i}`}>
          {Array.from({ length: NUM_FLOORS_EA }).map((_, f) => (
            <EnergyPillar 
              key={`${i}-${f}`} 
              position={[x, FLOOR_HEIGHT * f + FLOOR_HEIGHT / 2, z]} 
              height={FLOOR_HEIGHT} 
              color="#00FF94" 
            />
          ))}
        </group>
      ))}

      {/* Floor slabs */}
      {Array.from({ length: NUM_FLOORS_EA }, (_, i) => i + 1).map(f => {
        const key = `EA-F${f}-Imaging`;
        return (
          <HolographicFloor 
            key={f} 
            position={[0, FLOOR_HEIGHT * f, 0]} 
            size={[W, 0.3, D]} 
            color="#00FF94" 
            isActive={activeKeys.has(key)} 
          />
        );
      })}

      {/* Annex roof dome */}
      <mesh position={[0, FLOOR_HEIGHT * (NUM_FLOORS_EA + 1), 0]}>
        <sphereGeometry args={[4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial 
          color="#00FF94" 
          transparent 
          opacity={0.3} 
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
    </group>
  );
}

function WestAnnex({ activeKeys }) {
  const W = 5, D = 7;
  
  return (
    <group position={[-14, 0, 0]}>
      {/* Corner pillars */}
      {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z], i) => (
        <group key={`wa-corner-${i}`}>
          {Array.from({ length: NUM_FLOORS_WA }).map((_, f) => (
            <EnergyPillar 
              key={`${i}-${f}`} 
              position={[x, FLOOR_HEIGHT * f + FLOOR_HEIGHT / 2, z]} 
              height={FLOOR_HEIGHT} 
              color={COLORS.accent} 
            />
          ))}
        </group>
      ))}

      {/* Floor slabs */}
      {Array.from({ length: NUM_FLOORS_WA }, (_, i) => i + 1).map(f => {
        const key = `WA-F${f}-Corridor`;
        return (
          <HolographicFloor 
            key={f} 
            position={[0, FLOOR_HEIGHT * f, 0]} 
            size={[W, 0.3, D]} 
            color={COLORS.accent} 
            isActive={activeKeys.has(key)} 
          />
        );
      })}

      {/* Angular roof */}
      <mesh position={[0, FLOOR_HEIGHT * (NUM_FLOORS_WA + 1), 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[7, 0.3, 7]} />
        <meshStandardMaterial 
          color={COLORS.accent} 
          metalness={0.8} 
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function NorthWing({ activeKeys }) {
  const isActive = activeKeys.has("NW-TriageHall") || 
                   activeKeys.has("NW-TraumaA") || 
                   activeKeys.has("NW-TraumaB");

  return (
    <group position={[3, 0, 11]}>
      {/* Two-floor structure */}
      <HolographicFloor 
        position={[0, 0.3, 0]} 
        size={[8, 0.4, 8]} 
        color={COLORS.danger} 
        opacity={0.25} 
        isActive={isActive} 
      />
      <HolographicFloor 
        position={[0, FLOOR_HEIGHT, 0]} 
        size={[8, 0.4, 8]} 
        color={COLORS.danger} 
        opacity={0.25} 
        isActive={isActive} 
      />

      {/* Support pillars */}
      {[[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].map(([x, z], i) => (
        <group key={`nw-pillar-${i}`}>
          <EnergyPillar 
            position={[x, FLOOR_HEIGHT / 2, z]} 
            height={FLOOR_HEIGHT} 
            color={COLORS.danger} 
          />
          <EnergyPillar 
            position={[x, FLOOR_HEIGHT * 1.5, z]} 
            height={FLOOR_HEIGHT} 
            color={COLORS.danger} 
          />
        </group>
      ))}

      {/* Emergency signage */}
      <Billboard position={[0, FLOOR_HEIGHT + 2, 0]}>
        <Text 
          fontSize={0.8} 
          color={COLORS.danger}
          fillOpacity={0.9}
          
        >
          EMERGENCY
        </Text>
      </Billboard>
    </group>
  );
}

// ─────────────────────────────────────────────────────
// Public BuildingModel Export
// ─────────────────────────────────────────────────────

export function BuildingModel({ activeIncidents, evacuationRoute }) {
  // Build set of active zone keys
  const activeKeys = useMemo(() => {
    const set = new Set();
    activeIncidents.forEach(inc => {
      const raw = inc.location.zone?.replace(/\s+/g, "");
      const key = `${inc.location.floor}-${raw}`;
      set.add(key);
      set.add(inc.location.zone?.replace(/\s+/g, "") || "");
    });
    return set;
  }, [activeIncidents]);

  // Build 3D path geometry from route nodes
  const pathPoints3D = useMemo(() => {
    if (!evacuationRoute || evacuationRoute.length < 2) return [];
    
    return evacuationRoute
      .map(node => {
        const coords = zoneCoordinates3D[node];
        if (!coords) return null;
        // Convert to 3D coordinates (y is already height in zoneCoordinates3D)
        return new THREE.Vector3(coords[0], coords[1] + 1, coords[2]);
      })
      .filter(Boolean);
  }, [evacuationRoute]);

  // Hazard beacon positions
  const hazardPositions = useMemo(() => {
    return activeIncidents
      .map(inc => {
        const raw = inc.location.zone?.replace(/\s+/g, "");
        const key = `${inc.location.floor}-${raw}`;
        const coords = zoneCoordinates3D[key] || zoneCoordinates3D[raw];
        if (!coords) return null;
        return {
          position: [coords[0], coords[1] + 2, coords[2]],
          type: inc.event_type
        };
      })
      .filter(Boolean);
  }, [activeIncidents]);

  return (
    <group>
      {/* Reflective ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0B1021"
          metalness={0.8}
        />
      </mesh>

      {/* Grid overlay */}
      <Grid 
        position={[0, 0.01, 0]} 
        args={[100, 100]} 
        cellColor={COLORS.primary}
        sectionColor={COLORS.secondary}
        fadeDistance={60}
        fadeStrength={2}
        lineWidth={1}
      />

      {/* Assembly Areas with holographic markers */}
      <group>
        {/* Front Assembly */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={[0, 0.5, 18]}>
            <cylinderGeometry args={[4, 4, 0.2, 48]} />
            <meshStandardMaterial 
              color={COLORS.safe} 
              emissive={COLORS.safe}
              emissiveIntensity={0.5}
              transparent 
              opacity={0.5}
            />
          </mesh>
        </Float>
        <Billboard position={[0, 2, 18]}>
          <Text 
            fontSize={0.7} 
            color={COLORS.safe}
            fillOpacity={0.9}
            
          >
            ASSEMBLY FRONT
          </Text>
        </Billboard>
        <Sparkles 
          count={30} 
          scale={[10, 2, 10]} 
          size={4} 
          speed={1} 
          color={COLORS.safe}
          position={[0, 1, 18]}
        />

        {/* Rear Assembly */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={[0, 0.5, -18]}>
            <cylinderGeometry args={[3, 3, 0.2, 48]} />
            <meshStandardMaterial 
              color="#69FF47" 
              emissive="#69FF47"
              emissiveIntensity={0.5}
              transparent 
              opacity={0.5}
            />
          </mesh>
        </Float>
        <Billboard position={[0, 2, -18]}>
          <Text 
            fontSize={0.7} 
            color="#69FF47"
            fillOpacity={0.9}
            
          >
            ASSEMBLY REAR
          </Text>
        </Billboard>

        {/* Helipad Assembly */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={[12, 0.5, 0]}>
            <cylinderGeometry args={[3.5, 3.5, 0.3, 48]} />
            <meshStandardMaterial 
              color="#FFEA00" 
              emissive="#FFEA00"
              emissiveIntensity={0.6}
              transparent 
              opacity={0.6}
            />
          </mesh>
        </Float>
        <Billboard position={[12, 2.5, 0]}>
          <Text 
            fontSize={0.7} 
            color="#FFEA00"
            fillOpacity={0.9}
            
          >
            HELIPAD
          </Text>
        </Billboard>
      </group>

      {/* Building Structures */}
      <MainTower activeKeys={activeKeys} />
      <EastAnnex activeKeys={activeKeys} />
      <WestAnnex activeKeys={activeKeys} />
      <NorthWing activeKeys={activeKeys} />

      {/* Staircase Shafts with glass visualization */}
      {[
        { key: "Stair-A", pos: [4, FLOOR_HEIGHT * 3, -2], height: FLOOR_HEIGHT * 7 },
        { key: "Stair-B", pos: [10, FLOOR_HEIGHT * 3, -2], height: FLOOR_HEIGHT * 7 },
        { key: "Stair-C", pos: [-10, FLOOR_HEIGHT * 3, -2], height: FLOOR_HEIGHT * 7 },
        { key: "Stair-D", pos: [-6, FLOOR_HEIGHT * 2.5, -4], height: FLOOR_HEIGHT * 6 },
      ].map(shaft => (
        <group key={shaft.key} position={shaft.pos}>
          <mesh>
            <boxGeometry args={[2, shaft.height, 2]} />
            <meshPhysicalMaterial 
              color={COLORS.glass}
              transparent 
              opacity={0.15} 
              transmission={0.95}
              thickness={0.5}
              roughness={0.1}
              metalness={0.9}
              wireframe
            />
          </mesh>
          {/* Internal spiral stairs hint */}
          <Line 
            points={Array.from({ length: 20 }, (_, i) => {
              const angle = (i / 20) * Math.PI * 8;
              const y = (i / 20) * shaft.height - shaft.height / 2;
              return new THREE.Vector3(
                Math.cos(angle) * 0.6,
                y,
                Math.sin(angle) * 0.6
              );
            })} 
            color={COLORS.primary} 
            lineWidth={2} 
          />
        </group>
      ))}

      {/* External Fire Escapes */}
      <FireEscapeColumn x={14} z={0} floors={NUM_FLOORS_EA + 1} />
      <FireEscapeColumn x={-15} z={0} floors={NUM_FLOORS_WA + 1} />

      {/* Skybridges with energy flow */}
      <Skybridge
        start={[6, FLOOR_HEIGHT * 3, -2]}
        end={[12, FLOOR_HEIGHT * 3, -6]}
        color={COLORS.primary}
      />
      <Skybridge
        start={[-6, FLOOR_HEIGHT * 3, -2]}
        end={[-12, FLOOR_HEIGHT * 3, -6]}
        color={COLORS.accent}
      />
      <Skybridge
        start={[6, FLOOR_HEIGHT * 5, -2]}
        end={[12, FLOOR_HEIGHT * 5, -7]}
        color={COLORS.secondary}
      />
      <Skybridge
        start={[-6, FLOOR_HEIGHT * 5, -2]}
        end={[-12, FLOOR_HEIGHT * 5, -7]}
        color={COLORS.accent}
      />

      {/* Evacuation Route */}
      {pathPoints3D.length > 1 && (
        <EvacuationRoute points={pathPoints3D} />
      )}

      {/* Hazard Beacons */}
      {hazardPositions.map((h, i) => (
        <HazardBeacon key={i} position={h.position} type={h.type} />
      ))}

      {/* Ambient atmospheric effects */}
      <Sparkles 
        count={100} 
        scale={[60, 20, 60]} 
        size={2} 
        speed={0.5} 
        color={COLORS.primary}
        position={[0, 10, 0]}
      />
    </group>
  );
}
