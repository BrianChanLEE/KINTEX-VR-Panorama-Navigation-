// Note 1: scenes 정적 데이터 모듈에서 기본 타입 구조 및 원본 데이터 배열을 가져옵니다.
import { ZONES, SCENES, type ZoneId, type Zone, type Scene, type Hotspot } from "../data/scenes";

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
