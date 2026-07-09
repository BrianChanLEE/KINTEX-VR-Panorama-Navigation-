import { ZONES, SCENES, type ZoneId, type Zone, type Scene } from "../data/scenes";
import type { Hotspot } from "./hotspot.model";

// Note 2: scene 관련 모델 타입들을 재내보내기(re-export)하여 타 모듈에서 통일된 경로로 사용할 수 있게 만듭니다.
export type { ZoneId, Zone, Scene, Hotspot };
export { ZONES, SCENES };

// Note 3: 특정 구역(Zone) 정보에 대한 인터페이스 모델 정의입니다.
export interface ZoneModel {
  id: ZoneId;
  ko: string;
  code: string;
  en: string;
}
