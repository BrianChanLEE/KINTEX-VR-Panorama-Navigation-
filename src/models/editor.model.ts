// Note 1: 핫스팟 편집 모드의 드래그 수정과 클릭 테스트 방식을 분류하는 유니온 타입입니다.
export type InteractionMode = "drag" | "click";

// Note 2: 편집 행위 완료 후 피드백을 주기 위한 Toast 알림창의 구조적 모델 정의입니다.
export interface ToastModel {
  message: string;
  type: "success" | "error";
}
