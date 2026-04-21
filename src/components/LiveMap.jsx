/**
 * SENTINEL LiveMap Component - 3D Edition
 * ========================================
 * React Three Fiber 3D building visualization with:
 * - Photorealistic holographic building model
 * - Real-time incident beacons with volumetric glow
 * - Dynamic evacuation route with animated path segments
 * - Intelligent camera targeting on active incidents
 * - Multiple assembly points with automatic route optimization
 *
 * Production Features:
 * - Physically-based rendering (PBR) materials
 * - Reflective ground plane with realistic shadows
 * - Animated hazard beacons with particle effects
 * - Debounced route recalculation
 * - Responsive HUD overlay
 * - Keyboard navigation support
 *
 * Note: Requires @react-three/fiber, @react-three/drei, and three packages
 */

import React, { useEffect, useState, useMemo, useRef, useCallback, Component } from "react";
import { Canvas } from '@react-three/fiber';
import { Stars, CameraControls, Environment } from '@react-three/drei';
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { dijkstra, getBlockedNodes } from "../utils/dijkstra";
import * as THREE from "three";
import { buildingGraph, zoneCoordinates3D } from "../utils/buildingGraph";
import { BuildingModel } from "./Building3D";
import { AlertTriangle, Target, Navigation, ShieldAlert, RefreshCw } from "lucide-react";

// ─── Canvas Error Boundary ────────────────────────────────────────────────────

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[3D Canvas] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-2xl p-8 text-center"
          style={{
            height: "650px",
            background: "radial-gradient(ellipse at center, #1a0a0a 0%, #030508 100%)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <AlertTriangle size={56} style={{ color: "#ef4444", marginBottom: "1rem" }} />
          <h3 style={{ color: "#f87171", fontWeight: 700, fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            3D Renderer Crashed
          </h3>
          <p style={{ color: "rgba(248,113,113,0.6)", fontSize: "0.85rem", maxWidth: "400px", marginBottom: "1.5rem" }}>
            {this.state.error?.message || "WebGL context was lost. This can happen due to GPU driver issues or too many 3D windows."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.6rem 1.5rem", borderRadius: "8px",
              background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Reload 3D View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}



// ─── Configuration ─────────────────────────────────────────────────────────────

const SIMULATION_START = "MT-4-Center";
const ASSEMBLY_GOALS = ["Assembly-Front", "Assembly-Rear", "Assembly-Helipad"];

// Event type configuration
const EVENT_CONFIG = {
  FIRE: { label: "FIRE", severity: "critical", color: "#FF3D00" },
  SMOKE: { label: "SMOKE", severity: "high", color: "#FFB300" },
  TRAPPED: { label: "TRAPPED", severity: "critical", color: "#2196F3" },
  MEDICAL: { label: "MEDICAL", severity: "high", color: "#9C27B0" },
  INJURY: { label: "INJURY", severity: "medium", color: "#FF5722" },
  PANIC: { label: "PANIC", severity: "medium", color: "#E91E63" }
};

// ─── Helper Components ─────────────────────────────────────────────────────────

/**
 * Intelligent camera that smoothly tracks active incidents
 */
function IntelligentCamera({ activeTarget, hasAlert }) {
  const cameraRef = useRef();

  useEffect(() => {
    if (!cameraRef.current) return;

    const controls = cameraRef.current;
    
    if (hasAlert && activeTarget) {
      // Zoom to incident location with offset for better view
      const [tx, ty, tz] = activeTarget;
      controls.setLookAt(
        tx + 8,
        ty + 10,
        tz + 12,
        tx,
        ty,
        tz,
        true
      );
    } else {
      // Return to overview position
      controls.setLookAt(
        0,
        28,
        45,
        0,
        8,
        0,
        true
      );
    }
  }, [activeTarget, hasAlert]);

  return (
    <>
      <CameraControls 
        ref={cameraRef} 
        makeDefault 
        minDistance={15}
        maxDistance={60}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping={true}
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.6}
      />
    </>
  );
}

/**
 * Alert status indicator
 */
function AlertIndicator({ hasAlert, incidentCount }) {
  return (
    <div
      className={`absolute top-4 left-4 z-10 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-500 ${
        hasAlert 
          ? "bg-red-950/80 border-red-500/50 animate-pulse" 
          : "bg-emerald-950/80 border-emerald-500/30"
      }`}
    >
      <div className="flex items-center gap-3">
        {hasAlert ? (
          <>
            <ShieldAlert className="text-red-400" size={24} />
            <div>
              <div className="text-red-400 font-bold text-sm tracking-wider">
                ACTIVE INCIDENTS
              </div>
              <div className="text-red-300 font-mono text-xs">
                {incidentCount} ZONE{incidentCount !== 1 ? "S" : ""} AFFECTED
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-emerald-400 font-bold text-sm">
              ALL CLEAR
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Route information HUD panel
 */
function RouteHUD({ routePath, bestAssembly, blockedCount, isCalculating }) {
  return (
    <div
      className="absolute bottom-6 left-6 right-6 z-10"
      style={{
        pointerEvents: "none"
      }}
    >
      <div
        className="rounded-xl border backdrop-blur-md shadow-2xl p-4"
        style={{
          borderColor: "rgba(0, 229, 255, 0.2)",
          background: "rgba(6, 9, 19, 0.92)",
          pointerEvents: "auto"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center animate-pulse"
              style={{ borderColor: "#00E676" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#00E676" }} />
            </div>
            <span className="font-bold text-sm tracking-wider uppercase text-white">
              Dijkstra Engine · Optimal Evacuation Route
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {bestAssembly && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg border" style={{ 
                background: "rgba(0,230,118,0.15)", 
                borderColor: "rgba(0,230,118,0.3)",
                color: "#00E676"
              }}>
                <Navigation size={14} />
                <span className="font-mono text-xs font-bold">{bestAssembly.replace("Assembly-", "")}</span>
              </div>
            )}
            
            {blockedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg border" style={{ 
                background: "rgba(255,61,0,0.15)", 
                borderColor: "rgba(255,61,0,0.3)",
                color: "#FF3D00"
              }}>
                <AlertTriangle size={14} />
                <span className="font-mono text-xs font-bold">{blockedCount} BLOCKED</span>
              </div>
            )}
            
            <div className="font-mono text-xs px-2 py-1 rounded" style={{ 
              background: "rgba(0,229,255,0.1)",
              color: "#00E5FF"
            }}>
              {isCalculating ? "CALCULATING..." : "ROUTE READY"}
            </div>
          </div>
        </div>

        {/* Route path visualization */}
        <div className="flex flex-wrap gap-1.5 text-xs font-mono font-bold tracking-tight">
          {routePath.length > 0 ? (
            routePath.map((node, idx) => (
              <React.Fragment key={node}>
                <span
                  className="px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105"
                  style={{
                    background: "rgba(0,230,118,0.08)",
                    borderColor: "rgba(0,230,118,0.25)",
                    color: "#00E676",
                    cursor: "default"
                  }}
                >
                  {node.length > 15 ? node.substring(0, 12) + "..." : node}
                </span>
                {idx < routePath.length - 1 && (
                  <span 
                    className="opacity-50 mt-1.5" 
                    style={{ color: "#00E676" }}
                  >
                    ›
                  </span>
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border animate-pulse" style={{ 
              background: "rgba(255,61,0,0.15)", 
              borderColor: "rgba(255,61,0,0.4)",
              color: "#FF3D00"
            }}>
              <AlertTriangle size={16} />
              <span className="font-bold">CRITICAL: NO SAFE EVACUATION PATH AVAILABLE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-[650px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 rounded-2xl">
      <div className="text-center space-y-4">
        <div className="inline-block w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-cyan-400 font-mono text-sm tracking-wider">
          INITIALIZING 3D BUILDING MODEL...
        </div>
      </div>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-[650px] bg-gradient-to-br from-red-950/50 via-slate-950 to-red-950/50 rounded-2xl p-8 text-center">
      <AlertTriangle size={64} className="text-red-500 mb-4" />
      <h3 className="text-red-400 font-bold text-xl mb-2">3D Visualization Error</h3>
      <p className="text-red-300/70 text-sm mb-6 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [evacuationRoute, setEvacuationRoute] = useState([]);
  const [bestAssembly, setBestAssembly] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Calculate optimal evacuation route
  const calculateOptimalRoute = useCallback((blockedNodes) => {
    setIsCalculating(true);

    // Debounce to prevent excessive calculations
    const timeoutId = setTimeout(() => {
      try {
        let bestRoute = [];
        let bestLen = Infinity;
        let bestGoal = null;

        // Try all assembly points and pick the shortest safe route
        for (const goal of ASSEMBLY_GOALS) {
          const route = dijkstra(buildingGraph, SIMULATION_START, goal, blockedNodes);
          if (route.length > 0 && route.length < bestLen) {
            bestLen = route.length;
            bestRoute = route;
            bestGoal = goal;
          }
        }

        setEvacuationRoute(bestRoute);
        setBestAssembly(bestGoal);

        if (bestRoute.length === 0) {
          console.warn("⚠️ CRITICAL: No valid evacuation route found!");
        }
      } catch (error) {
        console.error("Route calculation failed:", error);
        setEvacuationRoute([]);
        setBestAssembly(null);
        setHasError(true);
      } finally {
        setIsCalculating(false);
      }
    }, 200); // 200ms debounce

    return () => clearTimeout(timeoutId);
  }, []);

  // Listen to Firestore incidents in real-time
  useEffect(() => {
    const colRef = collection(db, "incidents");
    
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const active = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((inc) => inc.status === "ACTIVE");
        
        setIncidents(active);
        
        // Calculate blocked nodes from fire/smoke incidents
        const blocked = getBlockedNodes(active);
        
        // Recalculate optimal route
        calculateOptimalRoute(blocked);
        
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        setHasError(true);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [calculateOptimalRoute]);

  // Determine active target for camera
  const activeTarget = useMemo(() => {
    if (incidents.length === 0) return null;
    
    // Prioritize first critical incident
    const criticalIncident = incidents.find(
      inc => EVENT_CONFIG[inc.event_type]?.severity === "critical"
    ) || incidents[0];
    
    const raw = criticalIncident.location.zone?.replace(/\s+/g, "");
    const key = `${criticalIncident.location.floor}-${raw}`;
    
    return zoneCoordinates3D[key] || zoneCoordinates3D[raw] || null;
  }, [incidents]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (hasError) {
    return (
      <ErrorState 
        message="Failed to initialize 3D visualization. Please check your browser console for details." 
        onRetry={handleRetry} 
      />
    );
  }

  const hasAlert = incidents.length > 0;

  return (
    <CanvasErrorBoundary>
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ 
          height: "650px", 
          background: "radial-gradient(ellipse at center, #0B1021 0%, #030508 100%)" 
        }}
      >
        {/* 3D Canvas */}
        <Canvas 
          shadows={{ type: THREE.PCFShadowMap }} 
          camera={{ position: [0, 28, 45], fov: 45 }}
          gl={{ 
            antialias: true, 
            alpha: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              console.warn("[WebGL] Context lost — will attempt restore");
            });
          }}
        >
          {/* Background */}
          <color attach="background" args={["#030508"]} />
          
          {/* Atmospheric stars */}
          <Stars 
            radius={150} 
            depth={80} 
            count={6000} 
            factor={5} 
            saturation={0.2} 
            fade 
            speed={0.8} 
          />

          {/* Lighting setup */}
          <ambientLight intensity={0.35} />
          <pointLight position={[20, 35, 15]} intensity={2.5} color="#00E5FF" castShadow />
          <pointLight position={[-20, 25, -15]} intensity={1.5} color="#AA00FF" />
          <pointLight position={[0, -8, 15]} intensity={0.8} color="#651FFF" />
          
          {/* Directional light for shadows */}
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.2} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Optional environment map for realistic reflections */}
          <Environment preset="city" />

          {/* Building Model */}
          <BuildingModel 
            activeIncidents={incidents} 
            evacuationRoute={evacuationRoute} 
          />
          
          {/* Intelligent Camera */}
          <IntelligentCamera activeTarget={activeTarget} hasAlert={hasAlert} />
        </Canvas>

        {/* HUD Overlays */}
        <AlertIndicator hasAlert={hasAlert} incidentCount={incidents.length} />
        
        <RouteHUD 
          routePath={evacuationRoute}
          bestAssembly={bestAssembly}
          blockedCount={getBlockedNodes(incidents).length}
          isCalculating={isCalculating}
        />

        {/* Keyboard navigation hint */}
        <div className="absolute top-4 right-4 z-10 text-xs font-mono text-cyan-400/60 bg-slate-950/50 px-3 py-2 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Target size={12} />
            <span>DRAG to rotate · SCROLL to zoom · SHIFT+DRAG to pan</span>
          </div>
        </div>
      </div>
    </CanvasErrorBoundary>
  );
}
