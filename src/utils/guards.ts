// Note 1: 런타임 값들이 유효한 상태 또는 기대하는 엘리먼트 타입인지 확인해 주는 안전한 타입 가드(Type Guards) 목록입니다.
export const guards = {
  // Note 2: 키보드 입력 이벤트 발생 시 포커스된 대상이 텍스트 입력창인지 판별하여 에디터 핫키 단축키 발동을 억제합니다.
  isTextInput(target: EventTarget | null): boolean {
    if (!target) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    );
  },

  // Note 3: 씬 객체가 누락되었는지 확인하여 디펜시브 코드를 작성하도록 지원합니다.
  isValidSceneId(sceneId: string, scenes: Array<{ id: string }>): boolean {
    return scenes.some((s) => s.id === sceneId);
  }
};
