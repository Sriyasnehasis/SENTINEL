// SENTINEL Building Graph — Adjacency List for Evacuation Routing
// Keys are zone names, values are neighbor nodes with edge weights (travel cost)
// When fire detected in a zone: set all edges FROM that zone to Infinity
// Rerun Dijkstra from every occupied floor zone to AssemblyPoint

export const buildingGraph = {
  // Floor 3
  "3-EastWing":   { "StaircaseB": 1, "StaircaseC": 1, "3-WestWing": 2 },
  "3-WestWing":   { "StaircaseD": 1, "3-EastWing": 2 },
  // Floor 4
  "4-EastWing":   { "StaircaseB": 1, "StaircaseC": 1, "4-WestWing": 2 },
  "4-WestWing":   { "StaircaseD": 1, "4-EastWing": 2 },
  // Floor 5
  "5-EastWing":   { "StaircaseB": 1, "StaircaseC": 1, "5-WestWing": 2 },
  "5-WestWing":   { "StaircaseD": 1, "5-EastWing": 2 },
  // Floor 6
  "6-EastWing":   { "StaircaseB": 1, "StaircaseC": 1, "6-WestWing": 2 },
  "6-WestWing":   { "StaircaseD": 1, "6-EastWing": 2 },
  // Staircases
  "StaircaseA":   { "GroundFloor": 4 },
  "StaircaseB":   { "GroundFloor": 4, "3-EastWing": 1, "4-EastWing": 1, "5-EastWing": 1, "6-EastWing": 1 },
  "StaircaseC":   { "GroundFloor": 4, "3-EastWing": 1, "4-EastWing": 1, "5-EastWing": 1, "6-EastWing": 1 },
  "StaircaseD":   { "GroundFloor": 4, "3-WestWing": 1, "4-WestWing": 1, "5-WestWing": 1, "6-WestWing": 1 },
  // Ground
  "GroundFloor":  { "AssemblyPoint": 1 },
  "AssemblyPoint": {}
};

// Zone → approximate lat/lng mapping for Google Maps overlay
// Using Mumbai coordinates as example fictional hotel location
export const zoneCoordinates = {
  "3-EastWing":    { lat: 19.0762, lng: 72.8775 },
  "3-WestWing":    { lat: 19.0759, lng: 72.8772 },
  "4-EastWing":    { lat: 19.0761, lng: 72.8775 },
  "4-WestWing":    { lat: 19.0758, lng: 72.8772 },
  "5-EastWing":    { lat: 19.0760, lng: 72.8776 },
  "5-WestWing":    { lat: 19.0757, lng: 72.8771 },
  "6-EastWing":    { lat: 19.0763, lng: 72.8776 },
  "6-WestWing":    { lat: 19.0760, lng: 72.8771 },
  "StaircaseA":    { lat: 19.0756, lng: 72.8770 },
  "StaircaseB":    { lat: 19.0763, lng: 72.8774 },
  "StaircaseC":    { lat: 19.0764, lng: 72.8773 },
  "StaircaseD":    { lat: 19.0757, lng: 72.8771 },
  "GroundFloor":   { lat: 19.0765, lng: 72.8777 },
  "AssemblyPoint": { lat: 19.0765, lng: 72.8778 }
};

// Helper: convert floor + zone string to graph node key
export function floorZoneToNode(floor, zone) {
  if (!zone) return null;
  const zonePart = zone.replace(" ", "");
  return `${floor}-${zonePart}`;
}

// Helper: get node key from incident location object
export function incidentToNode(incident) {
  const loc = incident?.location;
  if (!loc) return null;
  return floorZoneToNode(loc.floor, loc.zone);
}

// ─────────────────────────────────────────────────────
// 3D Coordinates for React Three Fiber Building Model
// Format: [x, y, z] where y is height (floor level)
// ─────────────────────────────────────────────────────

const FLOOR_HEIGHT = 3.5;

export const zoneCoordinates3D = {
  // Main Tower - Floor 3
  "3-EastWing":    [6, FLOOR_HEIGHT * 3, 0],
  "3-WestWing":    [-6, FLOOR_HEIGHT * 3, 0],
  "MT-3-Center":   [0, FLOOR_HEIGHT * 3, 0],
  
  // Main Tower - Floor 4
  "4-EastWing":    [6, FLOOR_HEIGHT * 4, 0],
  "4-WestWing":    [-6, FLOOR_HEIGHT * 4, 0],
  "MT-4-Center":   [0, FLOOR_HEIGHT * 4, 0],
  "MT-4-EastHall": [6, FLOOR_HEIGHT * 4, 0],
  "MT-4-WestHall": [-6, FLOOR_HEIGHT * 4, 0],
  
  // Main Tower - Floor 5
  "5-EastWing":    [6, FLOOR_HEIGHT * 5, 0],
  "5-WestWing":    [-6, FLOOR_HEIGHT * 5, 0],
  "MT-5-Center":   [0, FLOOR_HEIGHT * 5, 0],
  
  // Main Tower - Floor 6
  "6-EastWing":    [6, FLOOR_HEIGHT * 6, 0],
  "6-WestWing":    [-6, FLOOR_HEIGHT * 6, 0],
  "MT-6-Center":   [0, FLOOR_HEIGHT * 6, 0],
  
  // East Annex (Floors 1-4)
  "EA-F1-Imaging": [14, FLOOR_HEIGHT * 1, 0],
  "EA-F2-Imaging": [14, FLOOR_HEIGHT * 2, 0],
  "EA-F3-Imaging": [14, FLOOR_HEIGHT * 3, 0],
  "EA-F4-Imaging": [14, FLOOR_HEIGHT * 4, 0],
  
  // West Annex (Floors 1-5)
  "WA-F1-Corridor": [-14, FLOOR_HEIGHT * 1, 0],
  "WA-F2-Corridor": [-14, FLOOR_HEIGHT * 2, 0],
  "WA-F3-Corridor": [-14, FLOOR_HEIGHT * 3, 0],
  "WA-F4-Corridor": [-14, FLOOR_HEIGHT * 4, 0],
  "WA-F5-Corridor": [-14, FLOOR_HEIGHT * 5, 0],
  
  // North Wing (Emergency/Trauma)
  "NW-TriageHall": [3, FLOOR_HEIGHT * 1, 11],
  "NW-TraumaA":    [3, FLOOR_HEIGHT * 1, 11],
  "NW-TraumaB":    [3, FLOOR_HEIGHT * 2, 11],
  
  // Staircases (vertical shafts)
  "Stair-A":       [4, FLOOR_HEIGHT * 3.5, -2],
  "Stair-B":       [10, FLOOR_HEIGHT * 3.5, -2],
  "Stair-C":       [-10, FLOOR_HEIGHT * 3.5, -2],
  "Stair-D":       [-6, FLOOR_HEIGHT * 3, -4],
  
  // Assembly Points (ground level)
  "Assembly-Front":   [0, 0.5, 18],
  "Assembly-Rear":    [0, 0.5, -18],
  "Assembly-Helipad": [12, 0.5, 0],
  
  // Ground Floor / Exit points
  "GroundFloor":     [0, 0.5, 0],
  "Exit-Main":       [0, 0.5, 8]
};

// Alias old graph keys to 3D coordinates for backward compatibility
zoneCoordinates3D["StaircaseA"] = zoneCoordinates3D["Stair-A"];
zoneCoordinates3D["StaircaseB"] = zoneCoordinates3D["Stair-B"];
zoneCoordinates3D["StaircaseC"] = zoneCoordinates3D["Stair-C"];
zoneCoordinates3D["StaircaseD"] = zoneCoordinates3D["Stair-D"];
zoneCoordinates3D["AssemblyPoint"] = zoneCoordinates3D["Assembly-Front"];
