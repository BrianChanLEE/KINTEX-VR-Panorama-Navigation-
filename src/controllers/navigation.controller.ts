import { useCallback, useState } from "react";
import { scenesByZone } from "../data/scenes";
import type { ZoneId } from "../models/scene.model";

// Note 1: 씬 탐색 상태 및 구역 선택 로직을 집중 처리하는 Navigation Controller입니다.
export function useNavigationController(initialSceneId = "aerial01") {
  const [sceneId, setSceneId] = useState(initialSceneId);

  // Note 2: 씬을 변경시키는 메인 내비게이션 콜백입니다.
  const goScene = useCallback((id: string) => {
    setSceneId(id);
  }, []);

  // Note 3: 구역(Zone) 탭 선택 시 구역의 첫 번째 씬으로 자동 전이시키는 비즈니스 로직 제어 콜백입니다.
  const goZone = useCallback((zone: ZoneId) => {
    const list = scenesByZone(zone);
    if (list.length) {
      setSceneId(list[0].id);
    }
  }, []);

  return {
    sceneId,
    goScene,
    goZone,
  };
}
