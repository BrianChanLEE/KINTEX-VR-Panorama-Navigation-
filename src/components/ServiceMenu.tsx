import type { Scene } from "../models/scene.model";
import type {
  MapTourSelection,
  ServiceTabId,
} from "../models/service-menu.model";
import ServiceMenuView from "../views/ServiceMenuView";

interface ServiceMenuProps {
  scene: Scene;
  serviceTab: ServiceTabId;
  menuCollapsed: boolean;
  selection: MapTourSelection;
  onSelectTab: (tab: ServiceTabId) => void;
  onToggleCollapsed: () => void;
  onSelectExhibition: (value: string) => void;
  onSelectFloor: (value: string) => void;
  onSelectDestination: (value: string) => void;
  onStartNavigation: () => void;
  onResetNavigation: () => void;
}

// Note 1: 서비스 메뉴는 탭 상태와 지도 투어 선택 상태를 중개하는 컨테이너입니다.
export default function ServiceMenu({
  scene,
  serviceTab,
  menuCollapsed,
  selection,
  onSelectTab,
  onToggleCollapsed,
  onSelectExhibition,
  onSelectFloor,
  onSelectDestination,
  onStartNavigation,
  onResetNavigation,
}: ServiceMenuProps) {
  return (
    <ServiceMenuView
      scene={scene}
      serviceTab={serviceTab}
      menuCollapsed={menuCollapsed}
      selection={selection}
      onSelectTab={onSelectTab}
      onToggleCollapsed={onToggleCollapsed}
      onSelectExhibition={onSelectExhibition}
      onSelectFloor={onSelectFloor}
      onSelectDestination={onSelectDestination}
      onStartNavigation={onStartNavigation}
      onResetNavigation={onResetNavigation}
    />
  );
}
