interface VRControlsViewProps {
  vrActive: boolean;
  fullActive: boolean;
  onVR: () => void;
  onFullscreen: () => void;
  onLook: () => void;
}

interface ControlItem {
  id: "vr" | "full" | "look";
  ko: string;
  icon: string;
}

const CONTROLS: readonly ControlItem[] = [
  { id: "vr", ko: "VR보기", icon: "information_vr" },
  { id: "full", ko: "전체보기", icon: "information_fullview" },
  { id: "look", ko: "둘러보기", icon: "information_lookaround" },
] as const;

// Note 1: VRControlsView는 VR 토글 및 카메라 동작제어 바의 구조 디자인 및 렌더만을 관리하는 리프 뷰 컴포넌트입니다.
export default function VRControlsView({
  vrActive,
  fullActive,
  onVR,
  onFullscreen,
  onLook,
}: VRControlsViewProps) {
  const vrIconUrl = `${import.meta.env.BASE_URL}icons8-vision-pro-50.png`;

  const handlers: Record<ControlItem["id"], () => void> = {
    vr: onVR,
    full: onFullscreen,
    look: onLook,
  };

  const activeMap: Record<ControlItem["id"], boolean> = {
    vr: vrActive,
    full: fullActive,
    look: false,
  };

  return (
    <div className="panorama-menu">
      {CONTROLS.map((control) => {
        const isActive = activeMap[control.id];
        const iconUrl =
          control.id === "vr"
            ? vrIconUrl
            : `${import.meta.env.BASE_URL}convention_kor/images/vr/new/${isActive ? `${control.icon}_on` : control.icon}.png`;

        return (
          <button
            key={control.id}
            type="button"
            onClick={handlers[control.id]}
            className={`panorama-btn ${isActive ? "enabled" : ""}`}
            title={control.ko}
          >
            <img className="btn-icon" src={iconUrl} alt="" aria-hidden="true" />
            <span className="btn-text">{control.ko}</span>
          </button>
        );
      })}
    </div>
  );
}
