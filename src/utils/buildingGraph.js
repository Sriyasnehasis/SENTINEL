/**
 * SENTINEL v3.0 — Production-Grade Hospital Campus Graph
 * Architecture:
 * - Main Tower (MT): 6 Floors + Roof Helipad (50x30 footprint)
 * - ER Wing: 2 Floors (South side, offset [0,0,-40])
 * - ICU Wing: 4 Floors (East side, offset [50,0,0])
 * - OPD Wing: 2 Floors (West side, offset [-45,0,0])
 * - Vertical: 4 Stairwells (A/B/C/D), 2 Elevator Banks, 2 Fire Escapes
 */

export const hospitalData = {
  // ─────────────────────────────────────────────
  // 1. NODE METADATA (For 3D Rendering & UI)
  // ─────────────────────────────────────────────
  nodes: {
    // === EXTERNAL & ASSEMBLY ZONES ===
    "EXT-Assembly-Front": { name: "Primary Evacuation Zone", type: "assembly", floor: 0, wing: "External", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: false }, maxCapacity: 1000, coords: [0, 0, 35] },
    "EXT-Assembly-Rear":  { name: "Secondary Evacuation Zone", type: "assembly", floor: 0, wing: "External", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: false }, maxCapacity: 500,  coords: [0, 0, -65] },
    "EXT-AmbulanceBay":   { name: "Ambulance Landing Zone",    type: "corridor", floor: 0, wing: "External", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true  }, maxCapacity: 50,   coords: [-20, 0, -50] },
    "EXT-HelipadGround":  { name: "Ground Helipad",            type: "assembly", floor: 0, wing: "External", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: false }, maxCapacity: 30,   coords: [0, 0, 30] },

    // === GROUND FLOOR (MT) ===
    "MT-G-Lobby":        { name: "Main Atrium Lobby",      type: "corridor",      floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 400, coords: [0, 0, 5] },
    "MT-G-Reception":    { name: "Admissions Reception",   type: "corridor",      floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 80,  coords: [0, 0, 12] },
    "MT-G-EastHall":     { name: "Ground East Corridor",   type: "corridor",      floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 150, coords: [18, 0, 0] },
    "MT-G-WestHall":     { name: "Ground West Corridor",   type: "corridor",      floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 150, coords: [-18, 0, 0] },
    "MT-G-NorthHall":    { name: "Ground North Corridor",  type: "corridor",      floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 100, coords: [0, 0, -8] },
    "MT-G-Pharmacy":     { name: "Outpatient Pharmacy",    type: "ward",          floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 40,  coords: [22, 0, 8] },
    "MT-G-Radiology":    { name: "Diagnostics Center",     type: "ward",          floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 60,  coords: [-22, 0, 10] },
    "MT-G-AdminOffice":  { name: "Administration",         type: "ward",          floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 30,  coords: [-22, 0, -5] },
    "MT-G-SecurityDesk": { name: "Security Operations",    type: "ward",          floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 10,  coords: [15, 0, 12] },
    "MT-G-Router1":      { name: "Ground Router Alpha",    type: "router",        floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [0, 0, 0] },
    "MT-G-Router2":      { name: "Ground Router Bravo",    type: "router",        floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [20, 0, 0] },
    "MT-G-NurseStation": { name: "Ground Nursing Hub",     type: "nurse_station", floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 20,  coords: [0, 0, -3] },

    // === GROUND FLOOR VERTICALS (MT) ===
    "Stair-A-G":     { name: "Stairwell A - Ground",          type: "stair",    floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50, coords: [20, 0, -14.5] },
    "Stair-B-G":     { name: "Stairwell B - Ground",          type: "stair",    floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50, coords: [-20, 0, -14.5] },
    "Stair-C-G":     { name: "Stairwell C - Ground (Fire)",   type: "stair",    floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50, coords: [8, 0, -7.5] },
    "Stair-D-G":     { name: "Stairwell D - Ground (Fire)",   type: "stair",    floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50, coords: [-8, 0, -7.5] },
    "Elevator-1-G":  { name: "Elevator Bank 1 - Ground",      type: "elevator", floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20, coords: [10, 0, -14.5] },
    "Elevator-2-G":  { name: "Elevator Bank 2 - Ground",      type: "elevator", floor: 0, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20, coords: [-10, 0, -14.5] },
    "FE-East-G":     { name: "East Fire Escape Exit",         type: "escape",   floor: 0, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15, coords: [25.8, 0, 0] },
    "FE-West-G":     { name: "West Fire Escape Exit",         type: "escape",   floor: 0, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15, coords: [-25.8, 0, 0] },

    // === GROUND FLOOR (ER) ===
    "ER-G-Entrance":    { name: "ER Main Entrance",       type: "corridor", floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: false }, maxCapacity: 200, coords: [0, 0, -32] },
    "ER-G-Triage":      { name: "ER Triage & Waiting",   type: "corridor", floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 150, coords: [0, 0, -35] },
    "ER-G-TraumaA":     { name: "Trauma Bay A",           type: "ward",     floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 15,  coords: [10, 0, -38] },
    "ER-G-TraumaB":     { name: "Trauma Bay B",           type: "ward",     floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 15,  coords: [-10, 0, -38] },
    "ER-G-WaitingRoom": { name: "ER Family Waiting",      type: "ward",     floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 100, coords: [0, 0, -32] },
    "ER-G-Ambulance":   { name: "Ambulance Arrival Hub",  type: "corridor", floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true  }, maxCapacity: 20,  coords: [12, 0, -42] },
    "ER-G-Router1":     { name: "ER Router Alpha",        type: "router",   floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,  coords: [0, 0, -35] },
    "Stair-C-ER-G":     { name: "ER Stairwell C - Ground",type: "stair",   floor: 0, wing: "ER Wing", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 40, coords: [12, 0, -42] },

    // === GROUND FLOOR (OPD) ===
    "OPD-G-Reception":   { name: "OPD Reception Hall",   type: "corridor", floor: 0, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: false }, maxCapacity: 200, coords: [-45, 0, 5] },
    "OPD-G-Cardiology":  { name: "OPD Cardiology Unit",  type: "ward",     floor: 0, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 40,  coords: [-48, 0, 5] },
    "OPD-G-Orthopedics": { name: "OPD Ortho Unit",       type: "ward",     floor: 0, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 40,  coords: [-48, 0, -5] },
    "OPD-G-WaitingArea": { name: "OPD Waiting Zone",     type: "ward",     floor: 0, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 150, coords: [-42, 0, 0] },
    "Stair-OPD-G":       { name: "OPD Stairwell - Ground",type: "stair",  floor: 0, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 40,  coords: [-50, 0, -5] },

    // === FLOOR 1 (MT) ===
    "MT-1-Center":      { name: "F1 Central Hub",        type: "corridor",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 150, coords: [0, 5, 0] },
    "MT-1-EastHall":    { name: "F1 East Corridor",      type: "corridor",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [18, 5, 0] },
    "MT-1-WestHall":    { name: "F1 West Corridor",      type: "corridor",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [-18, 5, 0] },
    "MT-1-NorthHall":   { name: "F1 North Corridor",     type: "corridor",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 100, coords: [0, 5, -8] },
    "MT-1-Cafeteria":   { name: "Hospital Cafeteria",    type: "ward",          floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 300, coords: [-20, 5, 12] },
    "MT-1-Auditorium":  { name: "Medical Auditorium",    type: "ward",          floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 200, coords: [20, 5, 12] },
    "MT-1-Cardiology":  { name: "Inpatient Cardiology",  type: "ward",          floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 50,  coords: [22, 5, -6] },
    "MT-1-Neurology":   { name: "Inpatient Neurology",   type: "ward",          floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 50,  coords: [-22, 5, -6] },
    "MT-1-NurseStation":{ name: "F1 Nursing Command",    type: "nurse_station", floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 15,  coords: [0, 5, -3] },
    "MT-1-Router1":     { name: "F1 Router Alpha",       type: "router",        floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [0, 5, 0] },
    "MT-1-Router2":     { name: "F1 Router Bravo",       type: "router",        floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [20, 5, 0] },
    "Stair-A-1":        { name: "Stairwell A - F1",      type: "stair",         floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [20, 5, -14.5] },
    "Stair-B-1":        { name: "Stairwell B - F1",      type: "stair",         floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-20, 5, -14.5] },
    "Stair-C-1":        { name: "Stairwell C - F1 (Fire)",type: "stair",        floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [8, 5, -7.5] },
    "Stair-D-1":        { name: "Stairwell D - F1 (Fire)",type: "stair",        floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-8, 5, -7.5] },
    "Elevator-1-1":     { name: "Elevator Bank 1 - F1",  type: "elevator",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [10, 5, -14.5] },
    "Elevator-2-1":     { name: "Elevator Bank 2 - F1",  type: "elevator",      floor: 1, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [-10, 5, -14.5] },
    "FE-East-1":        { name: "East Fire Escape F1",   type: "escape",        floor: 1, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [25.8, 5, 0] },
    "FE-West-1":        { name: "West Fire Escape F1",   type: "escape",        floor: 1, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [-25.8, 5, 0] },

    // === FLOOR 1 (ER/ICU/OPD) ===
    "ER-1-SurgicalHub":  { name: "Surgical Suite Hub",    type: "corridor", floor: 1, wing: "ER Wing",    equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 60,  coords: [0, 5, -35] },
    "ER-1-SurgicalA":    { name: "Operating Room A",      type: "ward",     floor: 1, wing: "ER Wing",    equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 10,  coords: [10, 5, -38] },
    "ER-1-SurgicalB":    { name: "Operating Room B",      type: "ward",     floor: 1, wing: "ER Wing",    equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 10,  coords: [-10, 5, -38] },
    "ER-1-Recovery":     { name: "Post-Op Recovery",      type: "ward",     floor: 1, wing: "ER Wing",    equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 40,  coords: [0, 5, -42] },
    "Bridge-MT-ER-1":    { name: "MT-ER Skybridge F1",    type: "corridor", floor: 1, wing: "Shared",     equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30,  coords: [0, 5, -23] },
    "Stair-C-ER-1":      { name: "ER Stairwell C - F1",  type: "stair",    floor: 1, wing: "ER Wing",    equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 40,  coords: [12, 5, -42] },

    "ICU-1-Central":     { name: "ICU Hub F1",            type: "corridor",      floor: 1, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true  }, maxCapacity: 50,  coords: [50, 5, 0] },
    "ICU-1-WardA":       { name: "General ICU A",         type: "ward",          floor: 1, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true  }, maxCapacity: 20,  coords: [55, 5, 6] },
    "ICU-1-WardB":       { name: "General ICU B",         type: "ward",          floor: 1, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true  }, maxCapacity: 20,  coords: [55, 5, -6] },
    "ICU-1-NurseStation":{ name: "ICU Nursing F1",        type: "nurse_station", floor: 1, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: false }, maxCapacity: 10,  coords: [50, 5, 3] },
    "Bridge-MT-ICU-1":   { name: "MT-ICU Skybridge F1",   type: "corridor",      floor: 1, wing: "Shared",   equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30, coords: [33, 5, 0] },
    "Stair-ICU-1":       { name: "ICU Stairwell - F1",    type: "stair",         floor: 1, wing: "ICU Wing", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 40, coords: [55, 5, -6] },

    "OPD-1-Corridor":    { name: "OPD Corridor F1",       type: "corridor", floor: 1, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: false }, maxCapacity: 80,  coords: [-45, 5, 0] },
    "OPD-1-Dermatology": { name: "OPD Dermatology",       type: "ward",     floor: 1, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 30,  coords: [-50, 5, 5] },
    "OPD-1-ENT":         { name: "OPD ENT Unit",          type: "ward",     floor: 1, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: true,  hasOxygenValve: true  }, maxCapacity: 30,  coords: [-50, 5, -5] },
    "Bridge-MT-OPD-1":   { name: "MT-OPD Skybridge F1",   type: "corridor", floor: 1, wing: "Shared",   equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30,  coords: [-31, 5, 0] },
    "Stair-OPD-1":       { name: "OPD Stairwell - F1",    type: "stair",    floor: 1, wing: "OPD Wing", equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 40,  coords: [-52, 5, -5] },

    // === FLOOR 2 (MT/ICU) ===
    "MT-2-Center":      { name: "F2 Central Hub",         type: "corridor",      floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 150, coords: [0, 10, 0] },
    "MT-2-EastHall":    { name: "F2 East Corridor",       type: "corridor",      floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [18, 10, 0] },
    "MT-2-WestHall":    { name: "F2 West Corridor",       type: "corridor",      floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [-18, 10, 0] },
    "MT-2-Lab":         { name: "Pathology Lab",          type: "ward",          floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: true  }, maxCapacity: 40,  coords: [22, 10, 8] },
    "MT-2-MRI":         { name: "MRI Suite",              type: "ward",          floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 30,  coords: [-22, 10, 10] },
    "MT-2-NurseStation":{ name: "F2 Nursing Command",     type: "nurse_station", floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 15,  coords: [0, 10, -3] },
    "MT-2-Router1":     { name: "F2 Router Alpha",        type: "router",        floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [0, 10, 0] },
    "MT-2-Router2":     { name: "F2 Router Bravo",        type: "router",        floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [20, 10, 0] },
    "Stair-A-2":        { name: "Stairwell A - F2",       type: "stair",         floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [20, 10, -14.5] },
    "Stair-B-2":        { name: "Stairwell B - F2",       type: "stair",         floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-20, 10, -14.5] },
    "Stair-C-2":        { name: "Stairwell C - F2 (Fire)",type: "stair",         floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [8, 10, -7.5] },
    "Stair-D-2":        { name: "Stairwell D - F2 (Fire)",type: "stair",         floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-8, 10, -7.5] },
    "Elevator-1-2":     { name: "Elevator Bank 1 - F2",   type: "elevator",      floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [10, 10, -14.5] },
    "Elevator-2-2":     { name: "Elevator Bank 2 - F2",   type: "elevator",      floor: 2, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [-10, 10, -14.5] },
    "FE-East-2":        { name: "East Fire Escape F2",    type: "escape",        floor: 2, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [25.8, 10, 0] },
    "FE-West-2":        { name: "West Fire Escape F2",    type: "escape",        floor: 2, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [-25.8, 10, 0] },

    "ICU-2-Central":    { name: "ICU Hub F2",             type: "corridor", floor: 2, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 50,  coords: [50, 10, 0] },
    "ICU-2-NeoNatal":   { name: "NICU (Neonatal)",        type: "ward",     floor: 2, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 30,  coords: [55, 10, 6] },
    "ICU-2-Cardio":     { name: "CICU (Cardio)",          type: "ward",     floor: 2, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 30,  coords: [55, 10, -6] },
    "Bridge-MT-ICU-2":  { name: "MT-ICU Skybridge F2",   type: "corridor",  floor: 2, wing: "Shared",   equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30, coords: [33, 10, 0] },
    "Stair-ICU-2":      { name: "ICU Stairwell - F2",     type: "stair",    floor: 2, wing: "ICU Wing", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 40, coords: [55, 10, -6] },

    // === FLOOR 3 (MT/ICU) ===
    "MT-3-Center":      { name: "F3 Central Hub",         type: "corridor",      floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 150, coords: [0, 15, 0] },
    "MT-3-EastHall":    { name: "F3 East Corridor",       type: "corridor",      floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [18, 15, 0] },
    "MT-3-WestHall":    { name: "F3 West Corridor",       type: "corridor",      floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [-18, 15, 0] },
    "MT-3-WardA":       { name: "Inpatient Ward A",       type: "ward",          floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 60,  coords: [22, 15, 8] },
    "MT-3-WardB":       { name: "Inpatient Ward B",       type: "ward",          floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 60,  coords: [-22, 15, 10] },
    "MT-3-NurseStation":{ name: "F3 Nursing Command",     type: "nurse_station", floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 15,  coords: [0, 15, -3] },
    "MT-3-Router1":     { name: "F3 Router Alpha",        type: "router",        floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [0, 15, 0] },
    "MT-3-Router2":     { name: "F3 Router Bravo",        type: "router",        floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [20, 15, 0] },
    "Stair-A-3":        { name: "Stairwell A - F3",       type: "stair",         floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [20, 15, -14.5] },
    "Stair-B-3":        { name: "Stairwell B - F3",       type: "stair",         floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-20, 15, -14.5] },
    "Stair-C-3":        { name: "Stairwell C - F3 (Fire)",type: "stair",         floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [8, 15, -7.5] },
    "Stair-D-3":        { name: "Stairwell D - F3 (Fire)",type: "stair",         floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-8, 15, -7.5] },
    "Elevator-1-3":     { name: "Elevator Bank 1 - F3",   type: "elevator",      floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [10, 15, -14.5] },
    "Elevator-2-3":     { name: "Elevator Bank 2 - F3",   type: "elevator",      floor: 3, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [-10, 15, -14.5] },
    "FE-East-3":        { name: "East Fire Escape F3",    type: "escape",        floor: 3, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [25.8, 15, 0] },
    "FE-West-3":        { name: "West Fire Escape F3",    type: "escape",        floor: 3, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [-25.8, 15, 0] },

    "ICU-3-Central":    { name: "ICU Hub F3",             type: "corridor", floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 50,  coords: [50, 15, 0] },
    "ICU-3-Neuro":      { name: "Neuro ICU",              type: "ward",     floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 25,  coords: [55, 15, 8] },
    "ICU-3-BurnUnit":   { name: "Burn Center",            type: "ward",     floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 20,  coords: [55, 15, -8] },
    "Bridge-MT-ICU-3":  { name: "MT-ICU Skybridge F3",   type: "corridor",  floor: 3, wing: "Shared",   equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30, coords: [33, 15, 0] },

    "ICU-3-Central":    { name: "ICU Hub F3",             type: "corridor", floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 50,  coords: [50, 15, 0] },
    "ICU-3-Neuro":      { name: "Neuro ICU",              type: "ward",     floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 25,  coords: [55, 15, 8] },
    "ICU-3-BurnUnit":   { name: "Burn Center",            type: "ward",     floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: true, hasOxygenValve: true }, maxCapacity: 20,  coords: [55, 15, -8] },
    "Bridge-MT-ICU-3":  { name: "MT-ICU Skybridge F3",   type: "corridor",  floor: 3, wing: "Shared",   equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 30, coords: [35, 15, 0] },
    "Stair-ICU-3":      { name: "ICU Stairwell - F3",     type: "stair",    floor: 3, wing: "ICU Wing", equipment: { hasExtinguisher: true, hasAED: false, hasOxygenValve: false }, maxCapacity: 40, coords: [55, 15, -12] },

    // === FLOOR 4 (MT) ===
    "MT-4-Center":      { name: "F4 Central Hub",         type: "corridor",      floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 150, coords: [0, 20, 0] },
    "MT-4-EastHall":    { name: "F4 East Corridor",       type: "corridor",      floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [18, 20, 0] },
    "MT-4-WestHall":    { name: "F4 West Corridor",       type: "corridor",      floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 120, coords: [-18, 20, 0] },
    "MT-4-Maternity":   { name: "Labor & Delivery",       type: "ward",          floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 50,  coords: [22, 20, 8] },
    "MT-4-Nursery":     { name: "Newborn Nursery",        type: "ward",          floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: true  }, maxCapacity: 40,  coords: [-22, 20, 10] },
    "MT-4-NurseStation":{ name: "F4 Nursing Command",     type: "nurse_station", floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 15,  coords: [0, 20, -3] },
    "MT-4-Router1":     { name: "F4 Router Alpha",        type: "router",        floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [0, 20, 0] },
    "MT-4-Router2":     { name: "F4 Router Bravo",        type: "router",        floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: false, hasAED: false, hasOxygenValve: false }, maxCapacity: 0,   coords: [20, 20, 0] },
    "Stair-A-4":        { name: "Stairwell A - F4",       type: "stair",         floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [20, 20, -14.5] },
    "Stair-B-4":        { name: "Stairwell B - F4",       type: "stair",         floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-20, 20, -14.5] },
    "Stair-C-4":        { name: "Stairwell C - F4 (Fire)",type: "stair",         floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [8, 20, -7.5] },
    "Stair-D-4":        { name: "Stairwell D - F4 (Fire)",type: "stair",         floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50,  coords: [-8, 20, -7.5] },
    "Elevator-1-4":     { name: "Elevator Bank 1 - F4",   type: "elevator",      floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [10, 20, -14.5] },
    "Elevator-2-4":     { name: "Elevator Bank 2 - F4",   type: "elevator",      floor: 4, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20,  coords: [-10, 20, -14.5] },
    "FE-East-4":        { name: "East Fire Escape F4",    type: "escape",        floor: 4, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [25.8, 20, 0] },
    "FE-West-4":        { name: "West Fire Escape F4",    type: "escape",        floor: 4, wing: "External",   equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 15,  coords: [-25.8, 20, 0] },

    // === FLOOR 5 / ROOF (MT) ===
    "MT-5-RoofAccess":  { name: "Roof Access Hub",        type: "corridor", floor: 5, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 50, coords: [0, 30, 0] },
    "MT-5-Helipad":     { name: "MedEvac Helipad",        type: "assembly", floor: 5, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: true,  hasOxygenValve: false }, maxCapacity: 30, coords: [0, 30, 0] },
    "Stair-A-5":        { name: "Stairwell A - Roof",     type: "stair",    floor: 5, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 40, coords: [20, 25, -14.5] },
    "Elevator-1-5":     { name: "Elevator Bank 1 - Roof", type: "elevator", floor: 5, wing: "Main Tower", equipment: { hasExtinguisher: true,  hasAED: false, hasOxygenValve: false }, maxCapacity: 20, coords: [10, 25, -14.5] },
  },

  // ─────────────────────────────────────────────
  // 2. EDGE TRAVERSAL WEIGHTS (Dijkstra Distances)
  // ─────────────────────────────────────────────
  edges: {
    // External connections
    "EXT-Assembly-Front": { "MT-G-Reception": 25, "EXT-HelipadGround": 10, "FE-East-G": 30, "FE-West-G": 30 },
    "EXT-Assembly-Rear":  { "ER-G-Triage": 25, "EXT-AmbulanceBay": 20 },
    "EXT-AmbulanceBay":   { "ER-G-Ambulance": 15, "EXT-Assembly-Rear": 20 },
    "EXT-HelipadGround":  { "EXT-Assembly-Front": 10, "MT-G-Lobby": 25 },

    // MT Ground connections
    "MT-G-Lobby":        { "MT-G-Reception": 12, "MT-G-EastHall": 15, "MT-G-WestHall": 15, "MT-G-NorthHall": 15, "MT-G-Router1": 5, "MT-G-NurseStation": 10, "EXT-HelipadGround": 25 },
    "MT-G-Reception":    { "MT-G-Lobby": 12, "EXT-Assembly-Front": 25 },
    "MT-G-EastHall":     { "MT-G-Lobby": 15, "MT-G-Pharmacy": 10, "MT-G-SecurityDesk": 10, "MT-G-Router2": 5, "Stair-A-G": 12, "Stair-C-G": 12, "Elevator-1-G": 10, "FE-East-G": 15 },
    "MT-G-WestHall":     { "MT-G-Lobby": 15, "MT-G-Radiology": 10, "MT-G-AdminOffice": 10, "Stair-B-G": 12, "Stair-D-G": 12, "Elevator-2-G": 10, "FE-West-G": 15 },
    "MT-G-NorthHall":    { "MT-G-Lobby": 15, "MT-G-NurseStation": 8, "ER-G-Entrance": 20 },
    "MT-G-Pharmacy":     { "MT-G-EastHall": 10 },
    "MT-G-Radiology":    { "MT-G-WestHall": 10 },
    "MT-G-AdminOffice":  { "MT-G-WestHall": 10 },
    "MT-G-SecurityDesk": { "MT-G-EastHall": 10 },
    "MT-G-NurseStation": { "MT-G-Lobby": 10, "MT-G-NorthHall": 8 },
    "MT-G-Router1":      { "MT-G-Lobby": 5 },
    "MT-G-Router2":      { "MT-G-EastHall": 5 },

    // ER Ground connections
    "ER-G-Entrance":    { "MT-G-NorthHall": 20, "ER-G-WaitingRoom": 10 },
    "ER-G-WaitingRoom": { "ER-G-Entrance": 10, "ER-G-Triage": 10 },
    "ER-G-Triage":      { "ER-G-WaitingRoom": 10, "ER-G-TraumaA": 10, "ER-G-TraumaB": 10, "ER-G-Router1": 5, "EXT-Assembly-Rear": 25 },
    "ER-G-TraumaA":     { "ER-G-Triage": 10 },
    "ER-G-TraumaB":     { "ER-G-Triage": 10 },
    "ER-G-Ambulance":   { "ER-G-Triage": 12, "EXT-AmbulanceBay": 15, "Stair-C-ER-G": 8 },
    "ER-G-Router1":     { "ER-G-Triage": 5 },
    "Stair-C-ER-G":     { "ER-G-Ambulance": 8, "Stair-C-ER-1": 25 },

    // OPD Ground connections
    "OPD-G-Reception":   { "OPD-G-WaitingArea": 12, "MT-G-WestHall": 30 },
    "OPD-G-WaitingArea": { "OPD-G-Reception": 12, "OPD-G-Cardiology": 10, "OPD-G-Orthopedics": 10, "Stair-OPD-G": 10 },
    "OPD-G-Cardiology":  { "OPD-G-WaitingArea": 10 },
    "OPD-G-Orthopedics": { "OPD-G-WaitingArea": 10 },
    "Stair-OPD-G":       { "OPD-G-WaitingArea": 10, "Stair-OPD-1": 25 },

    // MT Floor 1 connections
    "MT-1-Center":      { "MT-1-EastHall": 15, "MT-1-WestHall": 15, "MT-1-NorthHall": 15, "MT-1-NurseStation": 8, "MT-1-Router1": 5, "Bridge-MT-ER-1": 25 },
    "MT-1-EastHall":    { "MT-1-Center": 15, "MT-1-Auditorium": 12, "MT-1-Cardiology": 12, "Stair-A-1": 12, "Stair-C-1": 12, "Elevator-1-1": 10, "FE-East-1": 15, "Bridge-MT-ICU-1": 20, "MT-1-Router2": 5 },
    "MT-1-WestHall":    { "MT-1-Center": 15, "MT-1-Cafeteria": 12, "MT-1-Neurology": 12, "Stair-B-1": 12, "Stair-D-1": 12, "Elevator-2-1": 10, "FE-West-1": 15, "Bridge-MT-OPD-1": 20 },
    "MT-1-NorthHall":   { "MT-1-Center": 15 },
    "MT-1-Cafeteria":   { "MT-1-WestHall": 12 },
    "MT-1-Auditorium":  { "MT-1-EastHall": 12 },
    "MT-1-Cardiology":  { "MT-1-EastHall": 12 },
    "MT-1-Neurology":   { "MT-1-WestHall": 12 },
    "MT-1-NurseStation":{ "MT-1-Center": 8 },
    "MT-1-Router1":     { "MT-1-Center": 5 },
    "MT-1-Router2":     { "MT-1-EastHall": 5 },

    // ER Floor 1 connections
    "ER-1-SurgicalHub": { "ER-1-SurgicalA": 10, "ER-1-SurgicalB": 10, "ER-1-Recovery": 12, "Bridge-MT-ER-1": 15, "Stair-C-ER-1": 10 },
    "ER-1-SurgicalA":   { "ER-1-SurgicalHub": 10 },
    "ER-1-SurgicalB":   { "ER-1-SurgicalHub": 10 },
    "ER-1-Recovery":    { "ER-1-SurgicalHub": 12 },
    "Bridge-MT-ER-1":   { "ER-1-SurgicalHub": 15, "MT-1-Center": 25 },
    "Stair-C-ER-1":     { "ER-1-SurgicalHub": 10, "Stair-C-ER-G": 15 },

    // ICU Floor 1 connections
    "ICU-1-Central":     { "ICU-1-WardA": 10, "ICU-1-WardB": 10, "ICU-1-NurseStation": 8, "Bridge-MT-ICU-1": 20, "Stair-ICU-1": 10 },
    "ICU-1-WardA":       { "ICU-1-Central": 10 },
    "ICU-1-WardB":       { "ICU-1-Central": 10 },
    "ICU-1-NurseStation":{ "ICU-1-Central": 8 },
    "Bridge-MT-ICU-1":   { "ICU-1-Central": 20, "MT-1-EastHall": 20 },
    "Stair-ICU-1":       { "ICU-1-Central": 10, "ICU-2-Central": 25 },

    // OPD Floor 1 connections
    "OPD-1-Corridor":    { "OPD-1-Dermatology": 10, "OPD-1-ENT": 10, "Bridge-MT-OPD-1": 12, "Stair-OPD-1": 10 },
    "OPD-1-Dermatology": { "OPD-1-Corridor": 10 },
    "OPD-1-ENT":         { "OPD-1-Corridor": 10 },
    "Bridge-MT-OPD-1":   { "OPD-1-Corridor": 12, "MT-1-WestHall": 20 },
    "Stair-OPD-1":       { "OPD-1-Corridor": 10, "Stair-OPD-G": 15 },

    // MT Floor 2 connections
    "MT-2-Center":      { "MT-2-EastHall": 15, "MT-2-WestHall": 15, "MT-2-NurseStation": 8, "MT-2-Router1": 5 },
    "MT-2-EastHall":    { "MT-2-Center": 15, "MT-2-Lab": 12, "Stair-A-2": 12, "Stair-C-2": 12, "Elevator-1-2": 10, "FE-East-2": 15, "Bridge-MT-ICU-2": 20, "MT-2-Router2": 5 },
    "MT-2-WestHall":    { "MT-2-Center": 15, "MT-2-MRI": 12, "Stair-B-2": 12, "Stair-D-2": 12, "Elevator-2-2": 10, "FE-West-2": 15 },
    "MT-2-Lab":         { "MT-2-EastHall": 12 },
    "MT-2-MRI":         { "MT-2-WestHall": 12 },
    "MT-2-NurseStation":{ "MT-2-Center": 8 },
    "MT-2-Router1":     { "MT-2-Center": 5 },
    "MT-2-Router2":     { "MT-2-EastHall": 5 },

    // ICU Floor 2 connections
    "ICU-2-Central":    { "ICU-2-NeoNatal": 10, "ICU-2-Cardio": 10, "Bridge-MT-ICU-2": 20, "Stair-ICU-2": 10 },
    "ICU-2-NeoNatal":   { "ICU-2-Central": 10 },
    "ICU-2-Cardio":     { "ICU-2-Central": 10 },
    "Bridge-MT-ICU-2":  { "ICU-2-Central": 20, "MT-2-EastHall": 20 },
    "Stair-ICU-2":      { "ICU-2-Central": 10, "ICU-1-Central": 15, "ICU-3-Central": 25 },

    // MT Floor 3 connections
    "MT-3-Center":      { "MT-3-EastHall": 15, "MT-3-WestHall": 15, "MT-3-NurseStation": 8, "MT-3-Router1": 5 },
    "MT-3-EastHall":    { "MT-3-Center": 15, "MT-3-WardA": 12, "Stair-A-3": 12, "Stair-C-3": 12, "Elevator-1-3": 10, "FE-East-3": 15, "Bridge-MT-ICU-3": 20, "MT-3-Router2": 5 },
    "MT-3-WestHall":    { "MT-3-Center": 15, "MT-3-WardB": 12, "Stair-B-3": 12, "Stair-D-3": 12, "Elevator-2-3": 10, "FE-West-3": 15 },
    "MT-3-WardA":       { "MT-3-EastHall": 12 },
    "MT-3-WardB":       { "MT-3-WestHall": 12 },
    "MT-3-NurseStation":{ "MT-3-Center": 8 },
    "MT-3-Router1":     { "MT-3-Center": 5 },
    "MT-3-Router2":     { "MT-3-EastHall": 5 },

    // ICU Floor 3 connections
    "ICU-3-Central":    { "ICU-3-Neuro": 10, "ICU-3-BurnUnit": 10, "Bridge-MT-ICU-3": 20, "Stair-ICU-3": 10 },
    "ICU-3-Neuro":      { "ICU-3-Central": 10 },
    "ICU-3-BurnUnit":   { "ICU-3-Central": 10 },
    "Bridge-MT-ICU-3":  { "ICU-3-Central": 20, "MT-3-EastHall": 20 },
    "Stair-ICU-3":      { "ICU-3-Central": 10, "ICU-2-Central": 15 },

    // MT Floor 4 connections
    "MT-4-Center":      { "MT-4-EastHall": 15, "MT-4-WestHall": 15, "MT-4-NurseStation": 8, "MT-4-Router1": 5 },
    "MT-4-EastHall":    { "MT-4-Center": 15, "MT-4-Maternity": 12, "Stair-A-4": 12, "Stair-C-4": 12, "Elevator-1-4": 10, "FE-East-4": 15, "MT-4-Router2": 5 },
    "MT-4-WestHall":    { "MT-4-Center": 15, "MT-4-Nursery": 12, "Stair-B-4": 12, "Stair-D-4": 12, "Elevator-2-4": 10, "FE-West-4": 15 },
    "MT-4-Maternity":   { "MT-4-EastHall": 12 },
    "MT-4-Nursery":     { "MT-4-WestHall": 12 },
    "MT-4-NurseStation":{ "MT-4-Center": 8 },
    "MT-4-Router1":     { "MT-4-Center": 5 },
    "MT-4-Router2":     { "MT-4-EastHall": 5 },

    // MT Floor 5 / Roof connections
    "MT-5-RoofAccess":  { "MT-5-Helipad": 20, "Stair-A-5": 10, "Elevator-1-5": 10 },
    "MT-5-Helipad":     { "MT-5-RoofAccess": 20 },

    // ── Vertical Connections ──────────────────────────────────────────────────

    // Stairwell A (East, Normal)
    "Stair-A-G": { "MT-G-EastHall": 12, "Stair-A-1": 25 },
    "Stair-A-1": { "Stair-A-G": 15, "MT-1-EastHall": 12, "Stair-A-2": 25 },
    "Stair-A-2": { "Stair-A-1": 15, "MT-2-EastHall": 12, "Stair-A-3": 25 },
    "Stair-A-3": { "Stair-A-2": 15, "MT-3-EastHall": 12, "Stair-A-4": 25 },
    "Stair-A-4": { "Stair-A-3": 15, "MT-4-EastHall": 12, "Stair-A-5": 25 },
    "Stair-A-5": { "Stair-A-4": 15, "MT-5-RoofAccess": 10 },

    // Stairwell B (West, Normal)
    "Stair-B-G": { "MT-G-WestHall": 12, "Stair-B-1": 25 },
    "Stair-B-1": { "Stair-B-G": 15, "MT-1-WestHall": 12, "Stair-B-2": 25 },
    "Stair-B-2": { "Stair-B-1": 15, "MT-2-WestHall": 12, "Stair-B-3": 25 },
    "Stair-B-3": { "Stair-B-2": 15, "MT-3-WestHall": 12, "Stair-B-4": 25 },
    "Stair-B-4": { "Stair-B-3": 15, "MT-4-WestHall": 12 },

    // Stairwell C (East, Fire-rated)
    "Stair-C-G": { "MT-G-EastHall": 12, "Stair-C-1": 25 },
    "Stair-C-1": { "Stair-C-G": 15, "MT-1-EastHall": 12, "Stair-C-2": 25 },
    "Stair-C-2": { "Stair-C-1": 15, "MT-2-EastHall": 12, "Stair-C-3": 25 },
    "Stair-C-3": { "Stair-C-2": 15, "MT-3-EastHall": 12, "Stair-C-4": 25 },
    "Stair-C-4": { "Stair-C-3": 15, "MT-4-EastHall": 12 },

    // Stairwell D (West, Fire-rated)
    "Stair-D-G": { "MT-G-WestHall": 12, "Stair-D-1": 25 },
    "Stair-D-1": { "Stair-D-G": 15, "MT-1-WestHall": 12, "Stair-D-2": 25 },
    "Stair-D-2": { "Stair-D-1": 15, "MT-2-WestHall": 12, "Stair-D-3": 25 },
    "Stair-D-3": { "Stair-D-2": 15, "MT-3-WestHall": 12, "Stair-D-4": 25 },
    "Stair-D-4": { "Stair-D-3": 15, "MT-4-WestHall": 12 },

    // Elevator Bank 1
    "Elevator-1-G": { "MT-G-EastHall": 10, "Elevator-1-1": 12 },
    "Elevator-1-1": { "Elevator-1-G": 12, "MT-1-EastHall": 10, "Elevator-1-2": 12 },
    "Elevator-1-2": { "Elevator-1-1": 12, "MT-2-EastHall": 10, "Elevator-1-3": 12 },
    "Elevator-1-3": { "Elevator-1-2": 12, "MT-3-EastHall": 10, "Elevator-1-4": 12 },
    "Elevator-1-4": { "Elevator-1-3": 12, "MT-4-EastHall": 10, "Elevator-1-5": 12 },
    "Elevator-1-5": { "Elevator-1-4": 12, "MT-5-RoofAccess": 10 },

    // Elevator Bank 2
    "Elevator-2-G": { "MT-G-WestHall": 10, "Elevator-2-1": 12 },
    "Elevator-2-1": { "Elevator-2-G": 12, "MT-1-WestHall": 10, "Elevator-2-2": 12 },
    "Elevator-2-2": { "Elevator-2-1": 12, "MT-2-WestHall": 10, "Elevator-2-3": 12 },
    "Elevator-2-3": { "Elevator-2-2": 12, "MT-3-WestHall": 10, "Elevator-2-4": 12 },
    "Elevator-2-4": { "Elevator-2-3": 12, "MT-4-WestHall": 10 },

    // East Fire Escape
    "FE-East-G": { "MT-G-EastHall": 15, "FE-East-1": 25, "EXT-Assembly-Front": 30 },
    "FE-East-1": { "FE-East-G": 20, "MT-1-EastHall": 15, "FE-East-2": 25 },
    "FE-East-2": { "FE-East-1": 20, "MT-2-EastHall": 15, "FE-East-3": 25 },
    "FE-East-3": { "FE-East-2": 20, "MT-3-EastHall": 15, "FE-East-4": 25 },
    "FE-East-4": { "FE-East-3": 20, "MT-4-EastHall": 15 },

    // West Fire Escape
    "FE-West-G": { "MT-G-WestHall": 15, "FE-West-1": 25, "EXT-Assembly-Front": 30 },
    "FE-West-1": { "FE-West-G": 20, "MT-1-WestHall": 15, "FE-West-2": 25 },
    "FE-West-2": { "FE-West-1": 20, "MT-2-WestHall": 15, "FE-West-3": 25 },
    "FE-West-3": { "FE-West-2": 20, "MT-3-WestHall": 15, "FE-West-4": 25 },
    "FE-West-4": { "FE-West-3": 20, "MT-4-WestHall": 15 },
  }
};

// ─── Fix: merge duplicate edge keys ─────────────────────────────────────────
// The MT-X-Center entries above overwrite earlier ones; rebuild cleanly.
Object.assign(hospitalData.edges, {
  "MT-1-Center": { "MT-1-EastHall": 15, "MT-1-WestHall": 15, "MT-1-NorthHall": 15, "MT-1-NurseStation": 8, "MT-1-Router1": 5, "Bridge-MT-ER-1": 25, "Stair-A-1": 18, "Stair-B-1": 18 },
  "MT-2-Center": { "MT-2-EastHall": 15, "MT-2-WestHall": 15, "MT-2-NurseStation": 8, "MT-2-Router1": 5 },
  "MT-3-Center": { "MT-3-EastHall": 15, "MT-3-WestHall": 15, "MT-3-NurseStation": 8, "MT-3-Router1": 5 },
  "MT-4-Center": { "MT-4-EastHall": 15, "MT-4-WestHall": 15, "MT-4-NurseStation": 8, "MT-4-Router1": 5 },
});

// ─── Derived Exports for full component compatibility ─────────────────────────

/** Flat adjacency list used directly by the Dijkstra engine */
export const buildingGraph = hospitalData.edges;

/** [x, y, z] 3D coordinates keyed by node ID, used by Building3D and LiveMap */
export const zoneCoordinates3D = Object.fromEntries(
  Object.entries(hospitalData.nodes).map(([id, node]) => [id, node.coords])
);

/** Legacy 2D lat/lng stub — kept for backward-compat with any map overlays */
export const zoneCoordinates = {};

// ─── Helper utilities ────────────────────────────────────────────────────────

/** Convert floor + zone string to the graph node key format used in Firestore */
export function floorZoneToNode(floor, zone) {
  if (!zone) return null;
  return `${floor}-${zone.replace(/\s+/g, "")}`;
}

/** Derive a graph node key directly from a Firestore incident document */
export function incidentToNode(incident) {
  const loc = incident?.location;
  if (!loc) return null;
  return floorZoneToNode(loc.floor, loc.zone);
}

/** Return all node IDs that belong to a specific wing */
export function getNodesByWing(wing) {
  return Object.entries(hospitalData.nodes)
    .filter(([, node]) => node.wing === wing)
    .map(([id]) => id);
}

/** Return all node IDs on a specific floor number */
export function getNodesByFloor(floor) {
  return Object.entries(hospitalData.nodes)
    .filter(([, node]) => node.floor === floor)
    .map(([id]) => id);
}
