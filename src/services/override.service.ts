import type { ProjectOverrides } from "../models/hotspot.model";

const TUTORIAL_KEY = "kmice_hide_tutorial";

// Note 1: 핫스팟의 물리 저장소 동기화 요청(Save/Reset) 및 로컬스토리지 상태 저장을 총괄하는 서비스입니다.
export const overrideService = {
  // Note 2: 원격 로컬 서버에 편집된 핫스팟 좌표를 저장하는 API 호출을 수행합니다.
  async saveOverride(
    sceneKey: string,
    hotspotKey: string,
    ath: number,
    atv: number,
    screenX: number,
    screenY: number
  ): Promise<ProjectOverrides> {
    const response = await fetch("/__hotspot-editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneKey, hotspotKey, ath, atv, screenX, screenY }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    return data.overrides;
  },

  // Note 3: 특정 핫스팟의 수정 좌표 기록을 지우고 초기화시키는 API 호출을 수행합니다.
  async resetOverride(sceneKey: string, hotspotKey: string): Promise<ProjectOverrides> {
    const response = await fetch("/__hotspot-editor/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneKey, hotspotKey }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    return data.overrides;
  },

  // Note 4: 튜토리얼 다시 보지 않기 여부를 로컬스토리지에 저장합니다.
  dismissTutorialForever(isDismissed: boolean): void {
    try {
      if (isDismissed) {
        localStorage.setItem(TUTORIAL_KEY, "1");
      }
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
  },

  // Note 5: 튜토리얼 스토리지 정보 복원을 수행합니다.
  readTutorialDismiss(): boolean {
    try {
      return localStorage.getItem(TUTORIAL_KEY) === "1";
    } catch {
      return false;
    }
  }
};
