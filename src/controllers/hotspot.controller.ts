import { useCallback } from "react";
import type { Hotspot } from "../models/hotspot.model";
import { hotspotService } from "../services/hotspot.service";

// Note 1: 핫스팟의 표시 여부 필터링 및 탭 활성화에 기반한 상태 유효성 체크를 진행하는 Hotspot Controller입니다.
export function useHotspotController() {
  // Note 2: 현재 에디터 활성 탭 및 핫스팟 종류에 맞춰 화면 노출 대상 핫스팟을 필터링해 냅니다.
  const filterHotspots = useCallback((
    hotspots: Hotspot[],
    showHotspots: boolean,
    activeTab: string | null | undefined
  ): Hotspot[] => {
    return hotspots.filter((h) => {
      // 1. 핫스팟 전체 숨김 여부 판단
      if (!showHotspots) return false;

      // 2. 디밍용 배경 이미지 핫스팟은 특수한 UI 레이어이므로 일반 목록에서 제외
      if (h.url?.includes("dim-img")) return false;

      // 3. 소방 대피로, 비상구 등 안전 정보 핫스팟 여부 체크
      const isSafety = hotspotService.isSafetyHotspot(h.url);
      const isSafetyTabActive = activeTab === "safety";

      // 4. 안전 탭이 활성화되었을 때만 안전 핫스팟 노출, 아닐 때는 일반 핫스팟만 노출
      if (isSafety) {
        return isSafetyTabActive;
      }
      
      // 안전 탭 활성화 상태일 경우 비안전 핫스팟들은 숨김
      return !isSafetyTabActive;
    });
  }, []);

  return {
    filterHotspots,
  };
}
