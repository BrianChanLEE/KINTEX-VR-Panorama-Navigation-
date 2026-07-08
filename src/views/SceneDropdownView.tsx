import { SCENES, ZONES, type Scene } from "../models/scene.model";
import { sceneService } from "../services/scene.service";

interface SceneDropdownViewProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  current: Scene;
  currentId: string;
  onSelect: (id: string) => void;
}

// Note 1: SceneDropdownView는 씬들을 그룹별 드롭다운 탭으로 시각화 렌더링하는 순수 뷰 컴포넌트입니다.
export default function SceneDropdownView({
  open,
  setOpen,
  current,
  currentId,
  onSelect,
}: SceneDropdownViewProps) {
  return (
    <>
      {/* Location bar */}
      <div
        className="panorama-map"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        role="button"
        tabIndex={0}
      >
        <svg className="map-icon" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8.5 0C3.81 0 0 3.81 0 8.5C0 14.875 8.5 20 8.5 20S17 14.875 17 8.5C17 3.81 13.19 0 8.5 0ZM8.5 11.5C6.84 11.5 5.5 10.16 5.5 8.5S6.84 5.5 8.5 5.5S11.5 6.84 11.5 8.5S10.16 11.5 8.5 11.5Z"
            fill="#c40012"
          />
        </svg>
        <span className="map-text font-semibold pl-2 text-[#1f1f1f]">{current.ko}</span>
        <span className="map-plus">{open ? "−" : "+"}</span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="scene-dropdown-panel animate-rise-in no-scrollbar">
          {ZONES.map((zone) => {
            const list = sceneService.scenesByZone(zone.id);
            if (list.length === 0) return null;
            return (
              <div key={zone.id} className="mb-3.5">
                <div className="zone-header">
                  {zone.ko}
                  <span className="float-right bg-[#f1f1f1] text-[#8a8a8a] text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                  {list.map((sceneItem) => {
                    const isActive = sceneItem.id === currentId;
                    return (
                      <button
                        key={sceneItem.id}
                        type="button"
                        onClick={() => {
                          onSelect(sceneItem.id);
                          setOpen(false);
                        }}
                        className={`scene-item ${isActive ? "active" : ""}`}
                      >
                        <span className="scene-index">
                          {sceneItem.index}
                        </span>
                        <span className="scene-name">
                          {sceneItem.ko}
                        </span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c40012] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          <div className="pt-3 border-t border-[#e5e5e5] text-center text-[10px] font-semibold text-[#8a8a8a] uppercase tracking-[0.2em]">
            {SCENES.length} Scenes · SIC2027 SIC27-KINTEX
          </div>
        </div>
      )}
    </>
  );
}
