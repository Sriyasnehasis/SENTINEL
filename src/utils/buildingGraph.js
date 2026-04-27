/**
 * SENTINEL Hospital Architectural Graph (v3.1 CLEAN)
 * 
 * This graph defines the logical "Skeleton" of the hospital.
 * Following the "Visual Consistency" principle, we ONLY include nodes that:
 * 1. Have a clear 3D structure (Halls, Skybridges, Staircases, Elevators)
 * 2. Are critical navigation hubs (Centers, Lobbies)
 * 
 * NOTE: For Simulation Fidelity, Emergency Staircases (C & D) are restricted.
 * They are NOT primary pathways. They are only accessible via specific 
 * crisis diversion points (e.g., Floor 2 East) to demonstrate system logic.
 */

import * as THREE from 'three';

const FH = 5.0; // Floor Height constant

const hospitalData = {
  // 1. NODE DEFINITIONS (Visual Structures Only)
  nodes: {
    // === EXTERNAL & ASSEMBLY ZONES ===
    "EXT-Assembly-Front": { name: "Primary Evacuation Zone", type: "assembly", floor: 0, wing: "External", coords: [0, 0, 35] },
    "EXT-Assembly-Rear":  { name: "Secondary Evacuation Zone", type: "assembly", floor: 0, wing: "External", coords: [0, 0, -65] },
    "EXT-AmbulanceBay":   { name: "Ambulance Landing Zone",    type: "corridor", floor: 0, wing: "External", coords: [-20, 0, -50] },
    "EXT-HelipadGround":  { name: "Ground Helipad",            type: "assembly", floor: 0, wing: "External", coords: [0, 0, 30] },

    // === GROUND FLOOR (MT/ER/OPD) ===
    "MT-G-Lobby":        { name: "Main Atrium Lobby",      type: "corridor",      floor: 0, wing: "Main Tower", coords: [0, 0, 5] },
    "MT-G-Reception":    { name: "Admissions Reception",   type: "corridor",      floor: 0, wing: "Main Tower", coords: [0, 0, 12] },
    "MT-G-EastHall":     { name: "Ground East Corridor",   type: "corridor",      floor: 0, wing: "Main Tower", coords: [17, 0, 0] },
    "MT-G-WestHall":     { name: "Ground West Corridor",   type: "corridor",      floor: 0, wing: "Main Tower", coords: [-17, 0, 0] },
    "MT-G-NorthHall":    { name: "Ground North Corridor",  type: "corridor",      floor: 0, wing: "Main Tower", coords: [0, 0, -8] },
    "ER-G-Entrance":     { name: "ER Main Entrance",       type: "corridor",      floor: 0, wing: "ER Wing",    coords: [0, 0, -32] },
    "ER-G-Ambulance":    { name: "Ambulance Arrival Hub",  type: "corridor",      floor: 0, wing: "ER Wing",    coords: [12, 0, -42] },
    "OPD-G-Reception":   { name: "OPD Reception Hall",     type: "corridor",      floor: 0, wing: "OPD Wing",   coords: [-45, 0, 5] },

    // MT Ground Verticals
    "Stair-A-G":     { name: "Stairwell A - G",          type: "stair",    floor: 0, coords: [20, 0, -14.5] },
    "Stair-B-G":     { name: "Stairwell B - G",          type: "stair",    floor: 0, coords: [-20, 0, -14.5] },
    "Stair-C-G":     { name: "Stairwell C - G",          type: "stair",    floor: 0, coords: [8, 0, -7.5] },
    "Stair-D-G":     { name: "Stairwell D - G",          type: "stair",    floor: 0, coords: [-8, 0, -7.5] },
    "Elevator-1-G":  { name: "Elevator 1 - G",          type: "elevator", floor: 0, coords: [10, 0, -14.5] },
    "Elevator-2-G":  { name: "Elevator 2 - G",          type: "elevator", floor: 0, coords: [-10, 0, -14.5] },
    "FE-East-G":     { name: "East Fire Escape",         type: "escape",   floor: 0, coords: [25.8, 0, 0] },
    "FE-West-G":     { name: "West Fire Escape",         type: "escape",   floor: 0, coords: [-25.8, 0, 0] },

    // === FLOOR 1 (MT/ER/ICU/OPD) ===
    "MT-1-Center":      { name: "F1 Central Hub",        type: "corridor",      floor: 1, wing: "Main Tower", coords: [0, 5, 0] },
    "MT-1-EastHall":    { name: "F1 East Corridor",      type: "corridor",      floor: 1, wing: "Main Tower", coords: [17, 5, 0] },
    "MT-1-WestHall":    { name: "F1 West Corridor",      type: "corridor",      floor: 1, wing: "Main Tower", coords: [-17, 5, 0] },
    "MT-1-NorthHall":   { name: "F1 North Corridor",     type: "corridor",      floor: 1, wing: "Main Tower", coords: [0, 5, -8] },
    "ER-1-SurgicalHub":  { name: "Surgical Suite Hub",    type: "corridor",      floor: 1, wing: "ER Wing",    coords: [0, 5, -40] },
    "ICU-1-Central":     { name: "ICU Hub F1",            type: "corridor",      floor: 1, wing: "ICU Wing",   coords: [50, 5, 0] },
    "OPD-1-Corridor":    { name: "OPD Corridor F1",       type: "corridor",      floor: 1, wing: "OPD Wing",   coords: [-45, 5, 0] },

    // MT Floor 1 Verticals
    "Stair-A-1":        { name: "Stairwell A - F1",      type: "stair",         floor: 1, coords: [20, 5, -14.5] },
    "Stair-B-1":        { name: "Stairwell B - F1",      type: "stair",         floor: 1, coords: [-20, 5, -14.5] },
    "Stair-C-1":        { name: "Stairwell C - F1",      type: "stair",         floor: 1, coords: [8, 5, -7.5] },
    "Stair-D-1":        { name: "Stairwell D - F1",      type: "stair",         floor: 1, coords: [-8, 5, -7.5] },
    "Elevator-1-1":     { name: "Elevator 1 - F1",      type: "elevator",      floor: 1, coords: [10, 5, -14.5] },
    "Elevator-2-1":     { name: "Elevator 2 - F1",      type: "elevator",      floor: 1, coords: [-10, 5, -14.5] },
    "Bridge-MT-ER-1":    { name: "MT-ER Skybridge F1",    type: "corridor",      floor: 1, coords: [0, 5, -23] },
    "Bridge-MT-ICU-1":   { name: "MT-ICU Skybridge F1",   type: "corridor",      floor: 1, coords: [33, 5, 0] },
    "Bridge-MT-OPD-1":   { name: "MT-OPD Skybridge F1",   type: "corridor",      floor: 1, coords: [-31, 5, 0] },
    "Stair-ICU-1":       { name: "ICU Stairwell - F1",    type: "stair",         floor: 1, coords: [57, 5, -7.2] },
    "Stair-C-ER-1":      { name: "ER Stairwell - F1",     type: "stair",         floor: 1, coords: [13, 5, -47] },
    "Stair-OPD-1":       { name: "OPD Stairwell - F1",    type: "stair",         floor: 1, coords: [-51.5, 5, -6.2] },
    "Stair-C-ER-G":      { name: "ER Stairwell - G",      type: "stair",         floor: 0, coords: [13, 0, -47] },
    "Stair-OPD-G":       { name: "OPD Stairwell - G",      type: "stair",         floor: 0, coords: [-51.5, 0, -6.2] },

    // === FLOOR 2 (MT/ICU) ===
    "MT-2-Center":      { name: "F2 Central Hub",         type: "corridor",      floor: 2, wing: "Main Tower", coords: [0, 10, 0] },
    "MT-2-EastHall":    { name: "F2 East Corridor",       type: "corridor",      floor: 2, wing: "Main Tower", coords: [17, 10, 0] },
    "MT-2-WestHall":    { name: "F2 West Corridor",       type: "corridor",      floor: 2, wing: "Main Tower", coords: [-17, 10, 0] },
    "ICU-2-Central":    { name: "ICU Hub F2",             type: "corridor",      floor: 2, wing: "ICU Wing",   coords: [50, 10, 0] },
    "Bridge-MT-ICU-2":  { name: "MT-ICU Skybridge F2",   type: "corridor",      floor: 2, coords: [33, 10, 0] },
    "Stair-A-2":        { name: "Stairwell A - F2",       type: "stair",         floor: 2, coords: [20, 10, -14.5] },
    "Stair-B-2":        { name: "Stairwell B - F2",       type: "stair",         floor: 2, coords: [-20, 10, -14.5] },
    "Stair-C-2":        { name: "Stairwell C - F2",       type: "stair",         floor: 2, coords: [8, 10, -7.5] },
    "Stair-D-2":        { name: "Stairwell D - F2",       type: "stair",         floor: 2, coords: [-8, 10, -7.5] },
    "Stair-ICU-2":      { name: "ICU Stairwell - F2",     type: "stair",         floor: 2, coords: [57, 10, -7.2] },

    // === FLOOR 3 (MT/ICU) ===
    "MT-3-Center":      { name: "F3 Central Hub",         type: "corridor",      floor: 3, wing: "Main Tower", coords: [0, 15, 0] },
    "MT-3-EastHall":    { name: "F3 East Corridor",       type: "corridor",      floor: 3, wing: "Main Tower", coords: [17, 15, 0] },
    "MT-3-WestHall":    { name: "F3 West Corridor",       type: "corridor",      floor: 3, wing: "Main Tower", coords: [-17, 15, 0] },
    "ICU-3-Central":    { name: "ICU Hub F3",             type: "corridor",      floor: 3, wing: "ICU Wing",   coords: [50, 15, 0] },
    "Bridge-MT-ICU-3":  { name: "MT-ICU Skybridge F3",   type: "corridor",      floor: 3, coords: [33, 15, 0] },
    "Stair-A-3":        { name: "Stairwell A - F3",       type: "stair",         floor: 3, coords: [20, 15, -14.5] },
    "Stair-B-3":        { name: "Stairwell B - F3",       type: "stair",         floor: 3, coords: [-20, 15, -14.5] },
    "Stair-C-3":        { name: "Stairwell C - F3",       type: "stair",         floor: 3, coords: [8, 15, -7.5] },
    "Stair-D-3":        { name: "Stairwell D - F3",       type: "stair",         floor: 3, coords: [-8, 15, -7.5] },
    "Stair-ICU-3":      { name: "ICU Stairwell - F3",     type: "stair",         floor: 3, coords: [57, 15, -7.2] },

    // === FLOOR 4 (MT/ICU) ===
    "MT-4-Center":      { name: "F4 Central Hub",         type: "corridor",      floor: 4, wing: "Main Tower", coords: [0, 20, 0] },
    "MT-4-EastHall":    { name: "F4 East Corridor",       type: "corridor",      floor: 4, wing: "Main Tower", coords: [17, 20, 0] },
    "MT-4-WestHall":    { name: "F4 West Corridor",       type: "corridor",      floor: 4, wing: "Main Tower", coords: [-17, 20, 0] },
    "ICU-4-Central":    { name: "ICU Hub F4",             type: "corridor",      floor: 4, wing: "ICU Wing",   coords: [50, 20, 0] },
    "Bridge-MT-ICU-4":  { name: "MT-ICU Skybridge F4",   type: "corridor",      floor: 4, coords: [33, 20, 0] },
    "Stair-A-4":        { name: "Stairwell A - F4",       type: "stair",         floor: 4, coords: [20, 20, -14.5] },
    "Stair-B-4":        { name: "Stairwell B - F4",       type: "stair",         floor: 4, coords: [-20, 20, -14.5] },
    "Stair-C-4":        { name: "Stairwell C - F4",       type: "stair",         floor: 4, coords: [8, 20, -7.5] },
    "Stair-D-4":        { name: "Stairwell D - F4",       type: "stair",         floor: 4, coords: [-8, 20, -7.5] },
    "Stair-ICU-4":      { name: "ICU Stairwell - F4",     type: "stair",         floor: 4, coords: [57, 20, -7.2] },

    // === FLOOR 5 (MT ROOF) ===
    "MT-5-RoofAccess":  { name: "Roof Access Hub",        type: "corridor",      floor: 5, wing: "Main Tower", coords: [0, 30, 0] },
    "MT-5-Helipad":     { name: "MedEvac Helipad",        type: "assembly",      floor: 5, wing: "Main Tower", coords: [0, 30, 0] },
    "Stair-A-5":        { name: "Stairwell A - Roof",     type: "stair",         floor: 5, coords: [20, 25, -14.5] },

    // === ADDITIONAL UNIT ZONES (FOR REGISTRATION SYNC) ===
    // MT Ground Aliases (for 0 vs G consistency)
    "MT-0-Center":      { name: "MT Ground Center",      type: "corridor", floor: 0, wing: "Main Tower", coords: [0, 0, 0] },
    "MT-0-EastHall":    { name: "MT Ground East",        type: "corridor", floor: 0, wing: "Main Tower", coords: [17, 0, 0] },
    "MT-0-WestHall":    { name: "MT Ground West",        type: "corridor", floor: 0, wing: "Main Tower", coords: [-17, 0, 0] },

    // ICU Recovery Nodes
    "ICU-1-Recovery":   { name: "ICU Recovery F1",       type: "corridor", floor: 1, wing: "ICU Wing",   coords: [55, 5, 5] },
    "ICU-2-Recovery":   { name: "ICU Recovery F2",       type: "corridor", floor: 2, wing: "ICU Wing",   coords: [55, 10, 5] },
    "ICU-3-Recovery":   { name: "ICU Recovery F3",       type: "corridor", floor: 3, wing: "ICU Wing",   coords: [55, 15, 5] },
    "ICU-4-Recovery":   { name: "ICU Recovery F4",       type: "corridor", floor: 4, wing: "ICU Wing",   coords: [55, 20, 5] },
    
    // ER Admissions/Waiting
    "ER-0-Admissions":  { name: "ER Admissions Hall",    type: "corridor", floor: 0, wing: "ER Wing",    coords: [8, 0, -32] },
    "ER-0-SurgicalHub": { name: "ER Surgical Hub G",     type: "corridor", floor: 0, wing: "ER Wing",    coords: [0, 0, -40] },
    "ER-0-Waiting":     { name: "ER Waiting Lounge",     type: "corridor", floor: 0, wing: "ER Wing",    coords: [-8, 0, -32] },
    "ER-1-Admissions":  { name: "ER Admissions F1",      type: "corridor", floor: 1, wing: "ER Wing",    coords: [8, 5, -32] },
    "ER-1-Waiting":     { name: "ER Waiting F1",         type: "corridor", floor: 1, wing: "ER Wing",    coords: [-8, 5, -32] },
    
    // OPD Pharmacy/Clinics
    "OPD-0-Pharmacy":   { name: "OPD Pharmacy Area",     type: "corridor", floor: 0, wing: "OPD Wing",   coords: [-50, 0, 10] },
    "OPD-0-Clinics":    { name: "OPD Clinics Area",      type: "corridor", floor: 0, wing: "OPD Wing",   coords: [-50, 0, -10] },
    "OPD-1-Pharmacy":   { name: "OPD Pharmacy F1",       type: "corridor", floor: 1, wing: "OPD Wing",   coords: [-50, 5, 10] },
    "OPD-1-Clinics":    { name: "OPD Clinics F1",        type: "corridor", floor: 1, wing: "OPD Wing",   coords: [-50, 5, -10] },

    // Additional floors for wing consistency
    "ICU-0-Central":    { name: "ICU Ground Central",    type: "corridor", floor: 0, wing: "ICU Wing",   coords: [50, 0, 0] },
    "ICU-0-Recovery":   { name: "ICU Ground Recovery",   type: "corridor", floor: 0, wing: "ICU Wing",   coords: [55, 0, 5] },
    "ER-2-SurgicalHub": { name: "ER Surgical Hub F2",    type: "corridor", floor: 2, wing: "ER Wing",    coords: [0, 10, -40] },
    "OPD-2-Corridor":   { name: "OPD Corridor F2",       type: "corridor", floor: 2, wing: "OPD Wing",   coords: [-45, 10, 0] },
  },

  // 2. EDGE DEFINITIONS (Clean Adjacency)
  edges: {
    // External
    "EXT-Assembly-Front": { "MT-G-Reception": 25, "EXT-HelipadGround": 10 },
    "EXT-Assembly-Rear":  { "ER-G-Entrance": 35, "EXT-AmbulanceBay": 20 },
    "EXT-AmbulanceBay":   { "ER-G-Ambulance": 15 },
    "EXT-HelipadGround":  { "EXT-Assembly-Front": 10, "MT-G-Lobby": 25 },

    // MT Ground
    "MT-G-Lobby":        { "MT-G-Reception": 12, "MT-G-EastHall": 15, "MT-G-WestHall": 15, "MT-G-NorthHall": 15 },
    "MT-G-Reception":    { "MT-G-Lobby": 12, "EXT-Assembly-Front": 25 },
    "MT-G-EastHall":     { "MT-G-Lobby": 15, "Stair-A-G": 12, "Elevator-1-G": 10, "FE-East-G": 15 }, // REMOVED Stair-C-G entry
    "MT-G-WestHall":     { "MT-G-Lobby": 15, "Stair-B-G": 12, "Elevator-2-G": 10, "FE-West-G": 15, "OPD-G-Reception": 30 }, // REMOVED Stair-D-G entry
    "MT-G-NorthHall":    { "MT-G-Lobby": 15, "ER-G-Entrance": 20 },
    "ER-G-Entrance":     { "MT-G-NorthHall": 20, "ER-G-Ambulance": 20 },
    "ER-G-Ambulance":    { "ER-G-Entrance": 20, "Stair-C-ER-G": 10 },
    "OPD-G-Reception":   { "MT-G-WestHall": 30, "Stair-OPD-G": 10 },

    // MT Floor 1
    "MT-1-Center":      { "MT-1-EastHall": 15, "MT-1-WestHall": 15, "MT-1-NorthHall": 15, "Bridge-MT-ER-1": 25 }, // REMOVED Stair-C/D entry
    "MT-1-EastHall":    { "MT-1-Center": 15, "Stair-A-1": 12, "Bridge-MT-ICU-1": 20 },
    "MT-1-WestHall":    { "MT-1-Center": 15, "Stair-B-1": 12, "Bridge-MT-OPD-1": 20 },
    "MT-1-NorthHall":   { "MT-1-Center": 15 },
    "Bridge-MT-ER-1":   { "MT-1-Center": 25, "ER-1-SurgicalHub": 15 },
    "Bridge-MT-ICU-1":  { "MT-1-EastHall": 20, "ICU-1-Central": 20 },
    "Bridge-MT-OPD-1":  { "MT-1-WestHall": 20, "OPD-1-Corridor": 15 },
    "ER-1-SurgicalHub": { "Bridge-MT-ER-1": 15, "Stair-C-ER-1": 10 },
    "ICU-1-Central":    { "Bridge-MT-ICU-1": 20, "Stair-ICU-1": 10 },
    "OPD-1-Corridor":   { "Bridge-MT-OPD-1": 15, "Stair-OPD-1": 10 },

    // MT Floor 2
    "MT-2-Center":      { "MT-2-EastHall": 15, "MT-2-WestHall": 15 }, // REMOVED Stair-D entry
    "MT-2-EastHall":    { "MT-2-Center": 15, "Stair-A-2": 12, "Bridge-MT-ICU-2": 20, "Stair-C-2": 10 }, // KEPT Stair-C-2 ENTRY for diversion
    "MT-2-WestHall":    { "MT-2-Center": 15, "Stair-B-2": 12 },
    "ICU-2-Central":    { "Bridge-MT-ICU-2": 20, "Stair-ICU-2": 10 },
    "Bridge-MT-ICU-2":  { "MT-2-EastHall": 20, "ICU-2-Central": 20 },

    // MT Floor 3
    "MT-3-Center":      { "MT-3-EastHall": 15, "MT-3-WestHall": 15 }, // REMOVED Stair-C/D entry
    "MT-3-EastHall":    { "MT-3-Center": 15, "Stair-A-3": 12, "Bridge-MT-ICU-3": 20 },
    "MT-3-WestHall":    { "MT-3-Center": 15, "Stair-B-3": 12 },
    "ICU-3-Central":    { "Bridge-MT-ICU-3": 20, "Stair-ICU-3": 10 },
    "Bridge-MT-ICU-3":  { "MT-3-EastHall": 20, "ICU-3-Central": 20 },

    // MT Floor 4
    "MT-4-Center":      { "MT-4-EastHall": 15, "MT-4-WestHall": 15 }, // REMOVED Stair-C/D entry
    "MT-4-EastHall":    { "MT-4-Center": 15, "Stair-A-4": 12, "Bridge-MT-ICU-4": 20 },
    "MT-4-WestHall":    { "MT-4-Center": 15, "Stair-B-4": 12 },
    "ICU-4-Central":    { "Bridge-MT-ICU-4": 20, "Stair-ICU-4": 10 },
    "Bridge-MT-ICU-4":  { "MT-4-EastHall": 20, "ICU-4-Central": 20 },

    // Vertical - Stair A
    "Stair-A-G": { "MT-G-EastHall": 12, "Stair-A-1": 25 },
    "Stair-A-1": { "Stair-A-G": 25, "MT-1-EastHall": 12, "Stair-A-2": 25 },
    "Stair-A-2": { "Stair-A-1": 25, "MT-2-EastHall": 12, "Stair-A-3": 25 },
    "Stair-A-3": { "Stair-A-2": 25, "MT-3-EastHall": 12, "Stair-A-4": 25 },
    "Stair-A-4": { "Stair-A-3": 25, "MT-4-EastHall": 12, "Stair-A-5": 25 },
    "Stair-A-5": { "Stair-A-4": 25, "MT-5-RoofAccess": 10 },

    // Vertical - Stair B
    "Stair-B-G": { "MT-G-WestHall": 12, "Stair-B-1": 25 },
    "Stair-B-1": { "Stair-B-G": 25, "MT-1-WestHall": 12, "Stair-B-2": 25 },
    "Stair-B-2": { "Stair-B-1": 25, "MT-2-WestHall": 12, "Stair-B-3": 25 },
    "Stair-B-3": { "Stair-B-2": 25, "MT-3-WestHall": 12, "Stair-B-4": 25 },
    "Stair-B-4": { "Stair-B-3": 25, "MT-4-WestHall": 12 },

    // Vertical - Stair C (Emergency Red) - FULL VERTICAL CHAIN KEPT
    "Stair-C-G": { "MT-G-EastHall": 12, "Stair-C-1": 25 }, // Exit point
    "Stair-C-1": { "Stair-C-G": 25, "Stair-C-2": 25 },
    "Stair-C-2": { "Stair-C-1": 25, "MT-2-EastHall": 10, "Stair-C-3": 25 }, // ENTRY POINT
    "Stair-C-3": { "Stair-C-2": 25, "Stair-C-4": 25 },
    "Stair-C-4": { "Stair-C-3": 25 },

    // Vertical - Stair D (Emergency Red) - VERTICAL CHAIN KEPT FOR POTENTIAL FUTURE DIVERSION
    "Stair-D-G": { "MT-G-WestHall": 12, "Stair-D-1": 25 },
    "Stair-D-1": { "Stair-D-G": 25, "Stair-D-2": 25 },
    "Stair-D-2": { "Stair-D-1": 25, "Stair-D-3": 25 },
    "Stair-D-3": { "Stair-D-2": 25, "Stair-D-4": 25 },
    "Stair-D-4": { "Stair-D-3": 25 },

    // Vertical - ICU Stair
    "Stair-ICU-1": { "ICU-1-Central": 10, "Stair-ICU-2": 25 },
    "Stair-ICU-2": { "Stair-ICU-1": 25, "ICU-2-Central": 10, "Stair-ICU-3": 25 },
    "Stair-ICU-3": { "Stair-ICU-2": 25, "ICU-3-Central": 10, "Stair-ICU-4": 25 },
    "Stair-ICU-4": { "Stair-ICU-3": 25, "ICU-4-Central": 10 },

    // Vertical - Other
    "Stair-C-ER-G": { "ER-G-Ambulance": 10, "Stair-C-ER-1": 25 },
    "Stair-C-ER-1": { "Stair-C-ER-G": 25, "ER-1-SurgicalHub": 10 },
    "Stair-OPD-G": { "OPD-G-Reception": 10, "Stair-OPD-1": 25 },
    "Stair-OPD-1": { "Stair-OPD-G": 25, "OPD-1-Corridor": 10 },

    // Connections for new zones
    "ICU-1-Recovery":   { "ICU-1-Central": 10 },
    "ICU-2-Recovery":   { "ICU-2-Central": 10 },
    "ICU-3-Recovery":   { "ICU-3-Central": 10 },
    "ICU-4-Recovery":   { "ICU-4-Central": 10 },
    "ICU-1-Central":    { "Bridge-MT-ICU-1": 20, "Stair-ICU-1": 10, "ICU-1-Recovery": 10 },
    "ICU-2-Central":    { "Bridge-MT-ICU-2": 20, "Stair-ICU-2": 10, "ICU-2-Recovery": 10 },
    "ICU-3-Central":    { "Bridge-MT-ICU-3": 20, "Stair-ICU-3": 10, "ICU-3-Recovery": 10 },
    "ICU-4-Central":    { "Bridge-MT-ICU-4": 20, "Stair-ICU-4": 10, "ICU-4-Recovery": 10 },

    "ER-0-Admissions":  { "ER-G-Entrance": 10 },
    "ER-0-Waiting":     { "ER-G-Entrance": 10 },
    "ER-G-Entrance":    { "MT-G-NorthHall": 20, "ER-G-Ambulance": 20, "ER-0-Admissions": 10, "ER-0-Waiting": 10 },
    
    "ER-1-Admissions":  { "ER-1-SurgicalHub": 10 },
    "ER-1-Waiting":     { "ER-1-SurgicalHub": 10 },
    "ER-1-SurgicalHub": { "Bridge-MT-ER-1": 15, "Stair-C-ER-1": 10, "ER-1-Admissions": 10, "ER-1-Waiting": 10 },

    "OPD-0-Pharmacy":   { "OPD-G-Reception": 10 },
    "OPD-0-Clinics":    { "OPD-G-Reception": 10 },
    "OPD-G-Reception":  { "MT-G-WestHall": 30, "Stair-OPD-G": 10, "OPD-0-Pharmacy": 10, "OPD-0-Clinics": 10 },
    
    "OPD-1-Pharmacy":   { "OPD-1-Corridor": 10 },
    "OPD-1-Clinics":    { "OPD-1-Corridor": 10 },
    "OPD-1-Corridor":   { "Bridge-MT-OPD-1": 15, "Stair-OPD-1": 10, "OPD-1-Pharmacy": 10, "OPD-1-Clinics": 10 },

    "MT-0-Center":      { "MT-G-Lobby": 10 },
    "MT-0-EastHall":    { "MT-G-EastHall": 5 },
    "MT-0-WestHall":    { "MT-G-WestHall": 5 },

    // New floor connections
    "ICU-0-Central":    { "ICU-0-Recovery": 10, "MT-G-EastHall": 33 },
    "ICU-0-Recovery":   { "ICU-0-Central": 10 },
    "ER-2-SurgicalHub": { "Stair-C-ER-1": 25 },
    "OPD-2-Corridor":   { "Stair-OPD-1": 25 },
  }
};

export { hospitalData };
export const buildingGraph = hospitalData.edges;
export const zoneCoordinates3D = Object.fromEntries(
  Object.entries(hospitalData.nodes).map(([id, node]) => [id, node.coords])
);

export function floorZoneToNode(floor, zone) {
  if (!zone) return null;
  // Clean zone name (e.g. "East Hall" -> "EastHall")
  const cleanZone = zone.replace(/\s+/g, "");
  const nodeId = `${floor}-${cleanZone}`;
  return hospitalData.nodes[nodeId] ? nodeId : null;
}
