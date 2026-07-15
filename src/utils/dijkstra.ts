import { SCENES } from "../data/scenes";
import type { Scene } from "../models/scene.model";
import addedHotspotsData from "../data/added-hotspots.json";

export function getZonesForExhibitionFloor(exhibition: string, floor: string): string[] {
  if (exhibition === "제1전시장") {
    if (floor === "1층") return ["floor1_1", "movingwalk", "exterior"];
    if (floor === "2층") return ["floor1_2"];
    if (floor === "3층") return ["floor1_3"];
  } else if (exhibition === "제2전시장") {
    if (floor === "1층") return ["floor2_l", "floor2_h", "movingwalk"];
    if (floor === "2층") return []; // 제2전시장은 데이터 상 2층 씬이 없습니다.
    if (floor === "3층") return ["floor2_3"];
    if (floor === "4층") return ["floor2_4"];
  }
  return [];
}

// Note 1: 3D 미니맵 상에서 주요 거점 씬들이 현실 전시장의 레이아웃과 동일하게 배치되도록 3D 공간 상의 절대적 Cartesian(데카르트) 좌표를 직접 매핑한 테이블입니다.
export const SCENE_POSITIONS: Record<string, { x: number; y: number; z: number; floor: number }> = {
  // Aerial / Exterior
  "aerial01": { x: 0, y: 35, z: 50, floor: 0 },
  "aerial02": { x: 30, y: 35, z: 50, floor: 0 },
  "aerial03": { x: -30, y: 35, z: 50, floor: 0 },
  "gate1a": { x: -50, y: 0, z: 30, floor: 1 },
  "gate2": { x: -20, y: 0, z: 30, floor: 1 },
  
  // 제1전시장 1층 로비 노드
  "lobby12": { x: -50, y: 0, z: 0, floor: 1 },
  "scene_2410": { x: -15, y: 0, z: 0, floor: 1 },
  "lobby5": { x: 20, y: 0, z: 0, floor: 1 },

  // 제1전시장 1층 전시홀 노드
  "scene_2420": { x: -50, y: 0, z: -25, floor: 1 }, // 전시3홀
  "scene_2422": { x: -15, y: 0, z: -25, floor: 1 },  // 전시4홀
  "scene_2424": { x: 20, y: 0, z: -25, floor: 1 },  // 전시5홀
  "scene_2411": { x: 10, y: 0, z: -25, floor: 1 },  // 전시5홀 내부 다른 노드

  // 무빙워크 노드 (제1전시장과 제2전시장을 잇는 수평 다리)
  "scene_2526": { x: 30, y: 0, z: 15, floor: 1 },
  "scene_2527": { x: 60, y: 0, z: 15, floor: 1 },

  // 제2전시장 1층 로비 노드
  "scene_2528": { x: 80, y: 0, z: 0, floor: 1 },
  "scene_2536": { x: 80, y: 0, z: -25, floor: 1 },
  "scene_2540": { x: 110, y: 0, z: -25, floor: 1 },
  "scene_2668": { x: 80, y: 12, z: 0, floor: 2 },
};

// Note 2: 특정 씬이 절대 매핑 테이블(SCENE_POSITIONS)에 존재하지 않을 때, 고유 씬 ID의 문자열 해시코드를 산출하고 이를 격자 기반의 그리드 상에 골고루 정렬해주는 Fallback 레이아웃 생성기입니다.
export function getSceneCoords(sceneId: string, zoneId: string) {
  if (SCENE_POSITIONS[sceneId]) {
    return SCENE_POSITIONS[sceneId];
  }

  // Note 3: 씬이 위치한 구역명(Zone ID)을 기반으로 적절한 높이(Y축)와 층수(Floor)를 추론합니다. KINTEX의 높낮이 레이어 모델을 구성합니다.
  let floor = 1;
  let y = 0;
  if (zoneId.includes("floor1_2") || zoneId.includes("floor2_l") || zoneId.includes("floor2_h")) {
    floor = 2;
    y = 12;
  } else if (zoneId.includes("floor1_3") || zoneId.includes("floor2_3")) {
    floor = 3;
    y = 24;
  } else if (zoneId.includes("floor2_4")) {
    floor = 4;
    y = 36;
  } else if (zoneId === "aerial") {
    floor = 0;
    y = 45;
  }

  // Note 4: 해시 함수로 각 문자의 아스키 코드 합을 누적하여 문자열마다 고유하지만 일관성 있는 X, Z 평면 좌표를 수학적으로 획득합니다. 리렌더링 시에도 노드의 3D 좌표가 변하지 않고 고정되도록 보장합니다.
  const hash = sceneId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const x = ((hash % 12) - 6) * 12;
  const z = (((hash >> 2) % 8) - 4) * 12;

  return { x, y, z, floor };
}

// Note 5: 360 VR 공간을 노드와 연결선 정보로 파싱하여 그래프를 만듭니다. 메모리 효율성을 위해 한 번 파싱한 연결 구조는 static 캐시(`cachedGraph`)에 저장하여 재사용합니다.
let cachedGraph: Record<string, string[]> | null = null;

export function buildAdjacencyGraph(): Record<string, string[]> {
  if (cachedGraph) return cachedGraph;

  const graph: Record<string, string[]> = {};

  const allScenes = SCENES;
  const addedData = addedHotspotsData as Record<string, any[]>;

  // Note 6: 인접 리스트(Adjacency List) 형태의 무방향 그래프 구조를 생성하기 위해 모든 씬 ID를 키값으로 하는 빈 배열 공간을 확보합니다.
  for (const scene of allScenes) {
    graph[scene.id] = [];
  }

  // Note 7: 각 씬의 이동 화살표(nav hotspots) 정보를 탐색하며 연결 관계(엣지)를 등록합니다. 한쪽에서 화살표를 잊어도 유연한 뒤돌아가기가 가능하도록 양방향(Undirected) 엣지로 동화 처리합니다.
  for (const scene of allScenes) {
    const sceneId = scene.id;
    const hotspots = scene.hotspots || [];
    const addedHotspots = addedData[sceneId] || [];

    const allHotspots = [...hotspots, ...addedHotspots];

    for (const h of allHotspots) {
      if (h.kind === "nav" && h.target) {
        const targetId = h.target;
        
        if (graph[targetId] !== undefined) {
          if (!graph[sceneId].includes(targetId)) {
            graph[sceneId].push(targetId);
          }
          if (!graph[targetId].includes(sceneId)) {
            graph[targetId].push(sceneId);
          }
        }
      }
    }
  }

  cachedGraph = graph;
  return graph;
}

// Note 8: 다익스트라(Dijkstra) 최단 경로 탐색 알고리즘의 구현체입니다. 시작 노드에서부터 모든 도달 가능한 노드들에 대한 최단 거리를 그리디하게 확장해 나가며, 여러 개의 타겟 노드 중 가장 가까운 목적지를 우선 발견하도록 설계되었습니다.
export function findShortestPath(startId: string, targetIds: Set<string>): string[] | null {
  const graph = buildAdjacencyGraph();
  
  if (!graph[startId]) return null;

  // Note 9: 무한대 값으로 거리를 초기화하고, 최단 경로 복원을 위한 역추적 맵(`previous`)과 미방문 노드 큐(`queue`)를 정렬합니다.
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];

  const startIsAerial = startId.startsWith("aerial");

  for (const node of Object.keys(graph)) {
    const isAerial = node.startsWith("aerial");
    // 도보 이동 경로 탐색 시 항공 뷰(드론 시점)를 다리 노드로 오용하여 순간이동하는 현상 방지
    if (isAerial && !startIsAerial && !targetIds.has(node)) {
      continue;
    }
    distances[node] = Infinity;
    previous[node] = null;
    queue.push(node);
  }
  distances[startId] = 0;

  while (queue.length > 0) {
    // Note 10: 거리가 가장 가까운 미방문 노드를 방문 순서 큐의 맨 앞으로 가져오도록 정렬 연산을 처리합니다 (우선순위 큐 효과).
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift()!;

    // 도달 불가능 노드만 남았을 경우 루프를 조기 종결합니다.
    if (distances[u] === Infinity) {
      break;
    }

    // Note 11: 복수의 후보 목적지 노드 중 임의의 첫 번째 요소에 도달한 순간, 역추적 경로맵(`previous`)을 역순으로 따라가며 최단 노드 시퀀스를 정밀하게 복원합니다.
    if (targetIds.has(u)) {
      const path: string[] = [];
      let curr: string | null = u;
      while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr];
      }
      return path;
    }

    // Note 12: 인접 노드들을 대조하며 기존에 기록된 최단 거리보다 더 짧은 루트를 발견할 경우, 가중치를 경신하는 Relaxation(경로 이완)을 실행합니다.
    const neighbors = graph[u] || [];
    for (const neighbor of neighbors) {
      if (!queue.includes(neighbor)) continue;
      const alt = distances[u] + 1; // 엣지 비용은 1로 균일하게 설정하여 최저 홉수 전환 유도
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = u;
      }
    }
  }

  return null;
}
