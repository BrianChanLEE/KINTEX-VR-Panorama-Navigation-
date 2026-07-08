// Note 1: scene 관련 공통 모델 타입 정보를 모델 패키지로부터 임포트합니다.
import type { ZoneId } from "../models/scene.model";
// Note 2: UI 그리기(Rendering) 책임을 완전히 위임하기 위해 FloorSelectorView 컴포넌트를 가져옵니다.
import FloorSelectorView from "../views/FloorSelectorView";

interface FloorSelectorProps {
  currentZone: ZoneId;
  onSelectZone: (zone: ZoneId) => void;
}

// Note 3: FloorSelector 컴포넌트는 MVC의 Controller 역할을 수행하여 비즈니스 속성을 View에 바인딩 및 중개합니다.
export default function FloorSelector({
  currentZone,
  onSelectZone,
}: FloorSelectorProps) {
  return (
    <FloorSelectorView
      currentZone={currentZone}
      onSelectZone={onSelectZone}
    />
  );
}


