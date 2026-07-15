import { useCallback } from "react";
import type { Hotspot } from "../models/hotspot.model";
import { filterDesktopHotspots } from "../services/hotspotVisibility.service";

// Note 1: 핫스팟의 표시 여부 필터링 및 탭 활성화에 기반한 상태 유효성 체크를 진행하는 Hotspot Controller입니다.
export function useHotspotController() {
  // Note 2: 현재 에디터 활성 탭 및 핫스팟 종류에 맞춰 화면 노출 대상 핫스팟을 필터링해 냅니다.
  const filterHotspots = useCallback((
    hotspots: Hotspot[],
    showHotspots: boolean,
    activeTab: string | null | undefined
  ): Hotspot[] => {
    return filterDesktopHotspots(hotspots, showHotspots, activeTab);
  }, []);

  return {
    filterHotspots,
  };
}
