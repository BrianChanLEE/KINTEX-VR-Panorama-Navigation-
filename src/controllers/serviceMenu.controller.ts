import { useCallback, useEffect, useState } from "react";
import type { Scene } from "../models/scene.model";
import type {
  MapTourSelection,
  NavigationStep,
  NavigationStepAction,
  ServiceTabId,
} from "../models/service-menu.model";
import { getScene, SCENES } from "../data/scenes";
import addedHotspotsData from "../data/added-hotspots.json";
import { getSceneCoords, findShortestPath } from "../utils/dijkstra";

const INITIAL_SELECTION: MapTourSelection = {
  currentLocation: "",
  selectedExhibition: "제1전시장",
  selectedFloor: "1층",
  selectedDestination: null,
  navigationRoute: [],
  navigationMode: "idle",
};

// 특정 목적지 카테고리/레이블에 해당하는 모든 대상 씬 ID를 검색합니다.
function findSceneIdsForDestination(destinationLabel: string): Set<string> {
  const targets = new Set<string>();
  const query = destinationLabel.toLowerCase().trim();
  const addedData = addedHotspotsData as Record<string, any[]>;

  for (const scene of SCENES) {
    const sceneId = scene.id;
    
    // 씬 이름 검색
    if (scene.ko.toLowerCase().includes(query) || scene.en.toLowerCase().includes(query)) {
      targets.add(sceneId);
    }
    
    // 정적 핫스팟 검색
    for (const h of scene.hotspots) {
      if (
        h.label.toLowerCase().includes(query) || 
        h.labelEn.toLowerCase().includes(query) ||
        (h.sub && h.sub.toLowerCase().includes(query))
      ) {
        targets.add(sceneId);
        if (h.target) targets.add(h.target);
      }
    }
    
    // 동적 핫스팟 검색
    const added = addedData[sceneId] || [];
    for (const h of added) {
      if (
        h.label.toLowerCase().includes(query) || 
        h.labelEn.toLowerCase().includes(query) ||
        (h.sub && h.sub.toLowerCase().includes(query)) ||
        (h.type && h.type.toLowerCase().includes(query))
      ) {
        targets.add(sceneId);
        if (h.target) targets.add(h.target);
      }
    }
  }

  // 예외/동의어 매핑 보완
  if (query === "화장실") {
    for (const scene of SCENES) {
      const added = addedData[scene.id] || [];
      const hasToilet = scene.hotspots.some(h => h.label.toLowerCase().includes("toilet") || h.label.toLowerCase().includes("화장실")) ||
                        added.some(h => h.type === "toilet" || h.label.toLowerCase().includes("화장실") || h.label.toLowerCase().includes("toilet"));
      if (hasToilet) {
        targets.add(scene.id);
      }
    }
  } else if (query === "안내데스크") {
    for (const scene of SCENES) {
      const added = addedData[scene.id] || [];
      const hasInfo = scene.hotspots.some(h => h.label.toLowerCase().includes("info") || h.label.toLowerCase().includes("안내")) ||
                      added.some(h => h.type === "info" || h.label.toLowerCase().includes("안내") || h.label.toLowerCase().includes("info"));
      if (hasInfo) {
        targets.add(scene.id);
      }
    }
  } else if (query === "식음료 시설") {
    for (const scene of SCENES) {
      const added = addedData[scene.id] || [];
      const hasFood = scene.hotspots.some(h => h.label.toLowerCase().includes("cafe") || h.label.toLowerCase().includes("식당")) ||
                      added.some(h => h.type === "cafe" || h.label.toLowerCase().includes("cafe") || h.label.toLowerCase().includes("식당"));
      if (hasFood) {
        targets.add(scene.id);
      }
    }
  } else if (query === "주요 부대시설") {
    for (const scene of SCENES) {
      const added = addedData[scene.id] || [];
      const hasConv = added.some(h => h.type === "convenience" || h.label.toLowerCase().includes("편의점"));
      if (hasConv) {
        targets.add(scene.id);
      }
    }
  }

  return targets;
}

// 다익스트라 경로로부터 NavigationStep 리스트를 생성합니다.
function buildRouteFromPath(path: string[], destinationLabel: string): NavigationStep[] {
  return path.map((sceneId, idx) => {
    const s = getScene(sceneId);
    const coords = getSceneCoords(sceneId, s.zone);
    
    let action: NavigationStepAction = "straight";
    let instruction = "";

    if (idx === 0) {
      instruction = `출발: ${s.ko}`;
      action = "straight";
    } else if (idx === path.length - 1) {
      instruction = `${s.ko} (${destinationLabel}) 도착`;
      action = "arrive";
    } else {
      const prevSceneId = path[idx - 1];
      const prevS = getScene(prevSceneId);
      const prevCoords = getSceneCoords(prevSceneId, prevS.zone);
      
      if (coords.floor > prevCoords.floor) {
        instruction = `계단/엘리베이터로 위층 이동 (${s.ko})`;
        action = "go-up";
      } else if (coords.floor < prevCoords.floor) {
        instruction = `계단/엘리베이터로 아래층 이동 (${s.ko})`;
        action = "go-down";
      } else {
        instruction = `${s.ko} 방향으로 이동`;
        action = "straight";
      }
    }

    return {
      id: `step-${sceneId}-${idx}`,
      order: idx + 1,
      instruction,
      action,
      floor: coords.floor,
      position: { x: coords.x, y: coords.y, z: coords.z },
      distance: idx * 15,
    };
  });
}

function deriveCurrentLocation(scene: Scene): string {
  return `${scene.ko}`;
}

export function useServiceMenuController(scene: Scene) {
  const [serviceTab, setServiceTab] = useState<ServiceTabId>("map-tour");
  const [menuCollapsed, setMenuCollapsed] = useState(true);
  const [selection, setSelection] = useState<MapTourSelection>(() => ({
    ...INITIAL_SELECTION,
    currentLocation: deriveCurrentLocation(scene),
  }));

  const selectTab = useCallback((tab: ServiceTabId) => {
    setServiceTab(tab);
  }, []);

  const selectExhibition = useCallback((selectedExhibition: string) => {
    setSelection((current) => ({
      ...current,
      selectedExhibition,
    }));
  }, []);

  const selectFloor = useCallback((selectedFloor: string) => {
    setSelection((current) => ({
      ...current,
      selectedFloor,
    }));
  }, []);

  const selectDestination = useCallback((selectedDestination: string) => {
    setSelection((current) => {
      const isSceneId = SCENES.some(s => s.id === selectedDestination);
      let targets = new Set<string>();
      let destLabel = selectedDestination;

      if (isSceneId) {
        targets.add(selectedDestination);
        try {
          destLabel = getScene(selectedDestination).ko;
        } catch {
          destLabel = selectedDestination;
        }
      } else {
        targets = findSceneIdsForDestination(selectedDestination);
      }

      const path = findShortestPath(scene.id, targets);
      const route = path ? buildRouteFromPath(path, destLabel) : [];
      return {
        ...current,
        selectedDestination,
        navigationMode: "preview",
        navigationRoute: route,
      };
    });
  }, [scene.id]);

  const startNavigation = useCallback(() => {
    setSelection((current) => ({
      ...current,
      navigationMode: current.selectedDestination ? "guiding" : "idle",
    }));
  }, []);

  const resetNavigation = useCallback(() => {
    setSelection((current) => ({
      ...current,
      selectedDestination: null,
      navigationMode: "idle",
      navigationRoute: [],
    }));
  }, []);

  const toggleMenuCollapsed = useCallback(() => {
    setMenuCollapsed((current) => !current);
  }, []);

  useEffect(() => {
    setSelection((current) => {
      const currentLoc = deriveCurrentLocation(scene);
      if (current.selectedDestination && current.navigationMode !== "idle") {
        const isSceneId = SCENES.some(s => s.id === current.selectedDestination);
        let targets = new Set<string>();
        let destLabel = current.selectedDestination;

        if (isSceneId) {
          targets.add(current.selectedDestination);
          try {
            destLabel = getScene(current.selectedDestination).ko;
          } catch {
            destLabel = current.selectedDestination;
          }
        } else {
          targets = findSceneIdsForDestination(current.selectedDestination);
        }

        const path = findShortestPath(scene.id, targets);
        const route = path ? buildRouteFromPath(path, destLabel) : [];
        return {
          ...current,
          currentLocation: currentLoc,
          navigationRoute: route,
        };
      }
      return {
        ...current,
        currentLocation: currentLoc,
      };
    });
  }, [scene]);

  return {
    serviceTab,
    selectTab,
    menuCollapsed,
    toggleMenuCollapsed,
    selection,
    selectExhibition,
    selectFloor,
    selectDestination,
    startNavigation,
    resetNavigation,
  };
}
