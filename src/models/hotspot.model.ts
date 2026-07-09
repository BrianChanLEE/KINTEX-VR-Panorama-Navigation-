// Note 1: scenes 정적 데이터 모듈에서 Hotspot 및 HotspotKind 기본 타입을 임포트합니다.
import type { Hotspot as BaseHotspot, HotspotKind } from "../data/scenes";

// Note 2: 타 컴포넌트에서 hotspot 모델을 단일화된 모델 폴더로부터 참조할 수 있도록 재수출합니다.
export interface Hotspot extends BaseHotspot {
  type?: string;
}
export type { HotspotKind };

// Note 3: 핫스팟 좌표 오버라이드 데이터 구조를 정의합니다.
// 로컬 스토리지 또는 JSON overrides 파일로부터 읽어온 개별 핫스팟의 수정 좌표 정보입니다.
export interface HotspotOverride {
  ath: number;          // 수정된 horizontal 각도 (longitude)
  atv: number;          // 수정된 vertical 각도 (latitude)
  screenOffsetX?: number; // 드래그 시 마우스 x 좌표 오프셋
  screenOffsetY?: number; // 드래그 시 마우스 y 좌표 오프셋
  updatedAt?: string;   // 수정 일시 타임스탬프
}

// Note 4: 씬 단위의 핫스팟 오버라이드 딕셔너리 구조입니다.
export type SceneOverrides = Record<string, HotspotOverride>;

// Note 5: 전체 프로젝트 단위의 핫스팟 오버라이드 맵 구조입니다.
export type ProjectOverrides = Record<string, SceneOverrides>;
