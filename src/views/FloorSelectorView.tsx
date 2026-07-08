import { ZONES, type ZoneId } from "../models/scene.model";
import { sceneService } from "../services/scene.service";

// Note 1: FloorSelectorViewProps 인터페이스 정의로 View 컴포넌트의 가시적 속성(Props) 타입을 제한합니다.
interface FloorSelectorViewProps {
  currentZone: ZoneId;
  onSelectZone: (zone: ZoneId) => void;
}

// Note 2: FloorSelectorView는 순수하게 JSX 마크업 및 스타일링 렌더링에만 집중하는 리프 뷰 컴포넌트입니다.
export default function FloorSelectorView({
  currentZone,
  onSelectZone,
}: FloorSelectorViewProps) {
  return (
    <div className="floor-selector no-scrollbar">
      {ZONES.map((zone) => {
        const isActive = zone.id === currentZone;
        const count = sceneService.scenesByZone(zone.id).length;
        
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onSelectZone(zone.id)}
            className={`floor-btn ${isActive ? "active" : ""}`}
          >
            <span className="floor-code">{zone.code}</span>
            <span className="floor-label">{zone.ko}</span>
            <span className="floor-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
