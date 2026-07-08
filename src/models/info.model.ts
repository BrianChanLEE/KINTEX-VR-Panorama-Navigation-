// Note 1: facility 데이터 모듈에서 기본 정보 탭 타입을 가져와 재수출합니다.
import type { InfoTab } from "../data/facility";

export type { InfoTab };

// Note 2: 각 상세 정보 분류 탭의 메타데이터를 구조화한 인터페이스입니다.
export interface TabMetadata {
  ko: string;
  en: string;
  icon: (p: { className?: string }) => JSX.Element;
}
