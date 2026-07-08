import { SCENES, type Scene, type ZoneId } from "../models/scene.model";

// Note 1: 특정 씬 식별자(sceneId)에 부합하는 씬 정보를 정적 데이터에서 신속히 조회합니다.
// 씬 ID가 잘못 입력될 경우를 고려해 기본 씬(예: aerial01) 또는 적절한 에러 핸들링을 적용합니다.
export const sceneService = {
  getScene(id: string): Scene {
    const scene = SCENES.find((s) => s.id === id);
    if (!scene) {
      // 안전장치: 존재하지 않는 씬 접근 시 첫 번째 씬(항공 뷰)으로 대체하여 크래시를 원천 방지합니다.
      return SCENES[0];
    }
    return scene;
  },

  // Note 2: 지정된 구역 ID에 부속된 씬 목록 전체를 필터링하여 배열로 반환합니다.
  scenesByZone(zone: ZoneId): Scene[] {
    return SCENES.filter((s) => s.zone === zone);
  },

  // Note 3: 해당 씬에서 시설정보 탭 노출이 필요한지 판별합니다 (항공뷰 제외).
  shouldShowInfoPanel(sceneId: string): boolean {
    const scene = this.getScene(sceneId);
    return scene.zone !== "aerial";
  }
};
