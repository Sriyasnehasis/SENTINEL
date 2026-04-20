/**
 * Dijkstra's Algorithm for Evacuation Route Calculation
 * Finds shortest path from start node to end node, avoiding blocked nodes
 */

/**
 * @param {Object} graph - Adjacency list representation of building
 * @param {string} start - Starting node name
 * @param {string} end - Destination node name
 * @param {string[]} blockedNodes - Array of node names to avoid (fire zones)
 * @returns {string[]} - Path as array of node names, or empty array if no path
 */
export function dijkstra(graph, start, end, blockedNodes = []) {
  const distances = {};
  const visited = new Set();
  const prev = {};
  
  // Initialize all distances to Infinity
  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
  });
  
  // Distance to start is 0
  distances[start] = 0;
  
  // Priority queue: [distance, node]
  const pq = [[0, start]];
  
  while (pq.length > 0) {
    // Sort by distance and get smallest
    pq.sort((a, b) => a[0] - b[0]);
    const [dist, node] = pq.shift();
    
    // Skip if already visited
    if (visited.has(node)) continue;
    visited.add(node);
    
    // Early exit if we reached destination
    if (node === end) break;
    
    // Explore neighbors
    const neighbors = graph[node] || {};
    for (const [neighbor, weight] of Object.entries(neighbors)) {
      // Skip blocked nodes
      if (blockedNodes.includes(neighbor)) continue;
      
      const newDist = dist + weight;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        prev[neighbor] = node;
        pq.push([newDist, neighbor]);
      }
    }
  }
  
  // Reconstruct path from end to start
  const path = [];
  let current = end;
  while (current !== undefined && current !== null) {
    path.unshift(current);
    current = prev[current];
  }
  
  // Return path only if it starts at the correct node
  return path[0] === start ? path : [];
}

/**
 * Get blocked nodes from active incidents
 * Blocks nodes where FIRE or SMOKE confidence > 0.8
 * @param {Array} incidents - Array of incident objects
 * @returns {string[]} - Array of blocked node names
 */
export function getBlockedNodes(incidents) {
  if (!Array.isArray(incidents)) return [];
  
  return incidents
    .filter(inc => {
      const isFireOrSmoke = inc.event_type === "FIRE" || inc.event_type === "SMOKE";
      const highConfidence = (inc.confidence ?? 0) > 0.8;
      const isActive = inc.status === "ACTIVE";
      return isFireOrSmoke && highConfidence && isActive;
    })
    .map(inc => {
      const floor = inc.location?.floor;
      const zone = inc.location?.zone;
      if (!floor || !zone) return null;
      // Convert "East Wing" to "EastWing" for graph key
      const zonePart = zone.replace(" ", "");
      return `${floor}-${zonePart}`;
    })
    .filter(Boolean); // Remove nulls
}

/**
 * Calculate evacuation routes for all occupied floors
 * @param {Object} graph - Building graph
 * @param {string[]} occupiedNodes - Nodes with guests/staff
 * @param {string[]} blockedNodes - Fire/smoke zones to avoid
 * @returns {Object} - Map of start node → path to AssemblyPoint
 */
export function calculateAllEvacuationRoutes(graph, occupiedNodes, blockedNodes) {
  const routes = {};
  
  for (const startNode of occupiedNodes) {
    const path = dijkstra(graph, startNode, "AssemblyPoint", blockedNodes);
    routes[startNode] = path;
  }
  
  return routes;
}

/**
 * Convert path to coordinates for Google Maps Polyline
 * @param {string[]} path - Array of node names
 * @param {Object} zoneCoordinates - Map of node → {lat, lng}
 * @returns {Array<{lat: number, lng: number}>} - Array of coordinate objects
 */
export function pathToCoordinates(path, zoneCoordinates) {
  return path
    .map(node => zoneCoordinates[node])
    .filter(Boolean); // Remove undefined coordinates
}
