import { buildAdjacencyGraph } from "../src/utils/dijkstra";

const graph = buildAdjacencyGraph();

// Dijkstra excluding aerial nodes
function findPathExcludingAerial(startId: string, targetId: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];

  for (const node of Object.keys(graph)) {
    const isAerial = node.startsWith("aerial");
    if (isAerial && node !== startId && node !== targetId) {
      continue;
    }
    distances[node] = Infinity;
    previous[node] = null;
    queue.push(node);
  }
  distances[startId] = 0;

  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift()!;
    if (distances[u] === Infinity) break;
    if (u === targetId) {
      const path: string[] = [];
      let curr: string | null = u;
      while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr];
      }
      return path;
    }
    const neighbors = graph[u] || [];
    for (const neighbor of neighbors) {
      if (!queue.includes(neighbor)) continue;
      const alt = distances[u] + 1;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = u;
      }
    }
  }
  return null;
}

console.log("Path excluding aerial:", findPathExcludingAerial("lobby12", "scene_2528"));
