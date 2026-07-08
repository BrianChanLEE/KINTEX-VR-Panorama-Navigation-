import type { Hotspot } from "../models/hotspot.model";
import type { ProjectOverrides } from "../models/hotspot.model";

// Note 1: 핫스팟의 에셋 경로(url) 또는 메타데이터 특징을 탐색하여 안전/소방 관련 시설 핫스팟인지 파악합니다.
export const hotspotService = {
  isSafetyHotspot(url?: string): boolean {
    if (!url) return false;
    const safetyKeywords = ["marker-fire", "marker-cctv", "marker-aed", "marker-safety", "marker-exit"];
    return safetyKeywords.some((keyword) => url.includes(keyword));
  },

  // Note 2: 원본 핫스팟 좌표(lon, lat)와 사용자가 에디터를 통해 커스텀 수정한 오버라이드 좌표 중 최종 적용 좌표를 해결(Resolve)해 줍니다.
  resolveHotspotCoordinates(
    h: Hotspot,
    sceneId: string,
    overrides: ProjectOverrides
  ): { lon: number; lat: number } {
    const sceneOverrides = overrides[sceneId] || {};
    const override = sceneOverrides[h.id || h.label];
    
    return {
      lon: override?.ath ?? h.lon,
      lat: override?.atv ?? h.lat,
    };
  }
};
