/**
 * SENTINEL v3.0 — Production-Grade Evacuation Routing Engine
 * ============================================================
 * - Binary Min-Heap priority queue  (O((V+E) log V))
 * - Dynamic hazard-weight inflation for FIRE/SMOKE zones
 * - NFPA 101 elevator lockout during emergencies
 * - Correct node-key derivation for hospitalData graph IDs
 */

// ─── Binary Min-Heap ─────────────────────────────────────────────────────────

class MinHeap {
  constructor() { this._data = []; }

  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top  = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this._data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent][0] <= this._data[i][0]) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._data[l][0] < this._data[smallest][0]) smallest = l;
      if (r < n && this._data[r][0] < this._data[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}

// ─── Hazard weight multipliers ────────────────────────────────────────────────

const HAZARD_WEIGHT = {
  FIRE:    Infinity, // Hard block — no entry
  SMOKE:   8,        // Heavy penalty
  TRAPPED: 3,        // Moderate — responders may need access
  MEDICAL: 2,        // Caution zone — responders must reach patients
  INJURY:  2,        // Same as medical
  PANIC:   1.5,      // Soft penalty — crowd interference
  default: 1,
};

// ─── Core Dijkstra ───────────────────────────────────────────────────────────

/**
 * Dijkstra shortest-path with hazard-weight inflation.
 *
 * @param {Object}   graph        - Weighted adjacency list { nodeId: { neighborId: weight } }
 * @param {string}   start        - Source node ID (must exist in graph)
 * @param {string}   end          - Destination node ID
 * @param {string[]} blockedNodes - Node IDs to avoid entirely (collapsed to Infinity weight)
 * @param {Object}   [hazardMap]  - { nodeId: eventType } for weight inflation
 * @param {boolean}  [lockElevators=false] - NFPA 101: disable elevator nodes in emergencies
 * @returns {string[]} Ordered path array, or [] if no safe route exists
 */
export function dijkstra(
  graph,
  start,
  end,
  blockedNodes = [],
  hazardMap    = {},
  lockElevators = false
) {
  if (!graph || !start || !end) return [];

  const blocked = new Set(blockedNodes);

  // Collect all known nodes (graph keys + all neighbors)
  const allNodes = new Set(Object.keys(graph));
  for (const neighbors of Object.values(graph)) {
    for (const n of Object.keys(neighbors)) allNodes.add(n);
  }
  // Ensure start and end are included even if leaf-only nodes
  allNodes.add(start);
  allNodes.add(end);

  const dist = {};
  const prev = {};
  for (const n of allNodes) dist[n] = Infinity;
  dist[start] = 0;

  const heap = new MinHeap();
  heap.push([0, start]);

  while (heap.size > 0) {
    const [d, node] = heap.pop();
    if (d > dist[node]) continue; // stale entry
    if (node === end) break;

    const neighbors = graph[node];
    if (!neighbors) continue;

    for (const [neighbor, baseWeight] of Object.entries(neighbors)) {
      // Hard block
      if (blocked.has(neighbor)) continue;

      // NFPA 101 elevator lockout
      if (lockElevators && neighbor.startsWith('Elevator-')) continue;

      // Hazard weight inflation
      const hazardType = hazardMap[neighbor];
      const multiplier = hazardType ? (HAZARD_WEIGHT[hazardType] ?? HAZARD_WEIGHT.default) : 1;
      if (multiplier === Infinity) continue;

      const newDist = d + baseWeight * multiplier;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = node;
        heap.push([newDist, neighbor]);
      }
    }
  }

  // Reconstruct path
  if (dist[end] === Infinity) return [];
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path[0] === start ? path : [];
}

// ─── Blocked-node derivation ─────────────────────────────────────────────────

/**
 * Derive the set of graph node IDs that should be blocked or weighted.
 * Maps Firestore incident location { floor, zone } → node ID used in hospitalData.
 *
 * @param {Array}   incidents   - Active Firestore incident documents
 * @returns {{ blocked: string[], hazardMap: Object }}
 */
export function getBlockedNodes(incidents) {
  if (!Array.isArray(incidents)) return { blocked: [], hazardMap: {} };

  const blocked   = [];
  const hazardMap = {};

  for (const inc of incidents) {
    if (inc.status !== 'ACTIVE') continue;

    const floor    = inc.location?.floor;
    const zone     = inc.location?.zone;
    const nodeId   = inc.location?.nodeId;
    const evtType  = inc.event_type;
    const affected = inc.affected_nodes || [];

    const allAffectedNodes = new Set(affected);
    const primaryKey = nodeId || (floor != null && zone ? `${floor}-${zone.replace(/\s+/g, '')}` : null);
    if (primaryKey) allAffectedNodes.add(primaryKey);

    const isBlocking =
      (evtType === 'FIRE' || evtType === 'SMOKE') &&
      (inc.confidence ?? 1) > 0.8;

    for (const nodeKey of allAffectedNodes) {
      hazardMap[nodeKey] = evtType;
      if (isBlocking) blocked.push(nodeKey);
    }
  }

  return { blocked, hazardMap };
}

// ─── Multi-route helper ───────────────────────────────────────────────────────

/**
 * Calculate evacuation routes from multiple occupied nodes to a goal.
 * Uses the new hospital graph node IDs.
 *
 * @param {Object}   graph          - hospitalData.edges
 * @param {string[]} occupiedNodes  - Source node IDs
 * @param {string[]} blockedNodes   - Blocked node IDs
 * @param {string}   [goal]         - Default assembly goal
 * @returns {Object} nodeId → path[]
 */
export function calculateAllEvacuationRoutes(
  graph,
  occupiedNodes,
  blockedNodes,
  goal = 'EXT-Assembly-Front'
) {
  const routes = {};
  for (const start of occupiedNodes) {
    routes[start] = dijkstra(graph, start, goal, blockedNodes);
  }
  return routes;
}

// ─── Coordinate mapping ───────────────────────────────────────────────────────

/**
 * Convert a route path to 3D coordinate triples.
 *
 * @param {string[]} path             - Ordered node IDs
 * @param {Object}   zoneCoordinates3D - { nodeId: [x, y, z] }
 * @returns {Array<[number,number,number]>} Filtered list of coordinates
 */
export function pathToCoordinates(path, zoneCoordinates3D) {
  return path.map(node => zoneCoordinates3D[node]).filter(Boolean);
}
