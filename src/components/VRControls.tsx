// Note 1: UI 렌더링을 완전히 위임하기 위해 VRControlsView 컴포넌트를 가져옵니다.
import VRControlsView from "../views/VRControlsView";

interface VRControlsProps {
  vrActive: boolean;
  fullActive: boolean;
  onVR: () => void;
  onFullscreen: () => void;
  onLook: () => void;
}

// Note 2: VRControls 컴포넌트는 Controller 역할을 수행하여 비즈니스 상태를 VRControlsView에 중개 및 바인딩합니다.
export default function VRControls({
  vrActive,
  fullActive,
  onVR,
  onFullscreen,
  onLook,
}: VRControlsProps) {
  return (
    <VRControlsView
      vrActive={vrActive}
      fullActive={fullActive}
      onVR={onVR}
      onFullscreen={onFullscreen}
      onLook={onLook}
    />
  );
}


