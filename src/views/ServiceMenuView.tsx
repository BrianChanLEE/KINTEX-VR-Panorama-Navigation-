import type { Scene } from "../models/scene.model";
import type {
  MapTourSelection,
  ServiceTabId,
} from "../models/service-menu.model";
import { MAP_TOUR_DESTINATIONS, MAP_TOUR_EXHIBITIONS } from "../data/service-menu";
import ServiceTabs from "../components/ServiceTabs";
import { IconArrowDown, IconChevron, IconClose } from "../components/icons";
import ThreeMapCanvas from "../components/ThreeMapCanvas";
import { SCENES } from "../data/scenes";
import { getZonesForExhibitionFloor } from "../utils/dijkstra";

interface ServiceMenuViewProps {
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

// Note 1: 서비스 메뉴 뷰는 서비스 탭과 지도 투어 뼈대를 그리는 순수 렌더러입니다.
export default function ServiceMenuView({
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
}: ServiceMenuViewProps) {
  const zones = getZonesForExhibitionFloor(selection.selectedExhibition, selection.selectedFloor);
  const floorScenes = SCENES.filter((s) => {
    const isInZone = zones.includes(s.zone);
    const hasNav = s.hotspots && s.hotspots.some((h) => h.kind === "nav" && h.target);
    return isInZone && hasNav;
  });

  const getDestinationLabel = () => {
    if (!selection.selectedDestination) return "미선택";
    const matchedScene = SCENES.find((s) => s.id === selection.selectedDestination);
    return matchedScene ? matchedScene.ko : selection.selectedDestination;
  };
  return (
    <div
      className={`absolute left-4 bottom-4 z-30 w-[min(92vw,980px)] overflow-hidden rounded-2xl border border-white/10 bg-white/96 text-[#1f1f1f] shadow-2xl backdrop-blur-md transition-transform duration-300 ${
        menuCollapsed ? "translate-y-[calc(100%-3rem)]" : "translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#1f1f1f] hover:border-[#c40012]/40"
            aria-label={menuCollapsed ? "서비스 메뉴 펼치기" : "서비스 메뉴 숨기기"}
          >
            <IconChevron className={`h-4 w-4 transition-transform ${menuCollapsed ? "-rotate-90" : "rotate-90"}`} />
          </button>
          <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Service Menu</div>
        </div>
        <div className="text-[12px] text-[#8a8a8a]">{menuCollapsed ? "숨김" : "열림"}</div>
      </div>

      {!menuCollapsed && <ServiceTabs activeTab={serviceTab} onSelect={onSelectTab} />}

      {!menuCollapsed && (
      <div className="grid gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-[#e5e5e5] bg-[#f8f8f8] p-3">
          <div>
            <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Current Location</div>
            <div className="mt-1 text-sm font-600 text-[#1f1f1f]">{scene.ko}</div>
            <div className="text-[12px] text-[#8a8a8a]">{scene.en}</div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Exhibition</div>
            <div className="grid gap-2">
              {MAP_TOUR_EXHIBITIONS.map((exhibition) => {
                const isActive = selection.selectedExhibition === exhibition.label;
                return (
                  <button
                    key={exhibition.id}
                    type="button"
                    onClick={() => onSelectExhibition(exhibition.label)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "border-[#c40012] bg-[#c40012]/10 text-[#c40012]"
                        : "border-[#e5e5e5] bg-white text-[#1f1f1f] hover:border-[#c40012]/40"
                    }`}
                  >
                    <div className="font-600">{exhibition.label}</div>
                    <div className="mt-1 text-[12px] text-[#8a8a8a]">{exhibition.floors.join(" · ")}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Floor</div>
            <div className="flex flex-wrap gap-2">
              {MAP_TOUR_EXHIBITIONS.find((exhibition) => exhibition.label === selection.selectedExhibition)?.floors.map((floor) => {
                const isActive = selection.selectedFloor === floor;
                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => onSelectFloor(floor)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? "bg-[#c40012] text-white"
                        : "bg-white text-[#1f1f1f] border border-[#e5e5e5] hover:border-[#c40012]/40"
                    }`}
                  >
                    {floor}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className={`grid gap-4 lg:grid-cols-[1fr_260px] ${serviceTab === "map-tour" ? "" : "hidden"}`}>
          <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#1a1e22]">
            <ThreeMapCanvas
              currentSceneId={scene.id}
              currentZoneId={scene.zone}
              route={selection.navigationRoute}
              navigationMode={selection.navigationMode}
              menuCollapsed={menuCollapsed}
              selectedExhibition={selection.selectedExhibition}
              selectedFloor={selection.selectedFloor}
              onSelectDestination={onSelectDestination}
            />

            <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[11px] font-700 uppercase tracking-[0.24em] text-white/70 backdrop-blur-sm pointer-events-none">
              3D 대화형 지도
            </div>

            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-[#1a1e22]/90 p-3 text-sm text-white backdrop-blur-sm pointer-events-none">
              <div className="flex items-center justify-between">
                <span className="font-600">지도 정보</span>
                <span className="text-[12px] text-emerald-400 font-500">
                  {selection.navigationMode === "guiding" ? "경로 안내 중" : "드래그하여 회전/줌 조절"}
                </span>
              </div>
              <div className="mt-1 text-[13px] text-zinc-400">
                {selection.selectedExhibition} · {selection.selectedFloor}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#e5e5e5] bg-[#f8f8f8] p-3">
            <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Destination</div>
            {floorScenes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-white p-4 text-center text-xs text-zinc-400">
                이동 가능한 위치 정보가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 max-h-[160px] overflow-y-auto pr-1">
                {floorScenes.map((fsScene) => (
                  <button
                    key={fsScene.id}
                    type="button"
                    onClick={() => onSelectDestination(fsScene.id)}
                    className={`rounded-xl border px-3 py-1.5 text-left text-sm transition-colors ${
                      selection.selectedDestination === fsScene.id
                        ? "border-[#c40012] bg-[#c40012]/10 text-[#c40012]"
                        : "border-[#e5e5e5] bg-white text-[#1f1f1f] hover:border-[#c40012]/40"
                    }`}
                  >
                    <div className="font-600 truncate">{fsScene.ko}</div>
                    <div className="text-[10px] text-[#8a8a8a] truncate">{fsScene.en}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-dashed border-[#d8d8d8] bg-white p-3 text-[13px] text-[#8a8a8a]">
              <div className="flex items-center gap-2 text-[#1f1f1f]">
                <IconArrowDown className="h-4 w-4" />
                경로 안내
              </div>
              <div className="mt-2 space-y-1">
                <div>출발: {selection.currentLocation}</div>
                <div>목적지: {getDestinationLabel()}</div>
                <div>모드: {selection.navigationMode === "guiding" ? "안내 중" : selection.navigationMode === "preview" ? "미리보기" : "대기"}</div>
                <div>경로 단계: {selection.navigationRoute.length ? `${selection.navigationRoute.length}개` : "준비 중"}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onStartNavigation}
                  disabled={!selection.selectedDestination}
                  className="flex-1 rounded-full bg-[#c40012] px-3 py-1.5 text-[12px] font-600 text-white hover:bg-[#c40012]/90 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors"
                >
                  안내 시작
                </button>
                <button
                  type="button"
                  onClick={onResetNavigation}
                  className="rounded-full border border-[#e5e5e5] px-3 py-1.5 text-[12px] font-600 text-[#1f1f1f] hover:bg-[#f8f8f8] transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border border-dashed border-[#d8d8d8] bg-[#fafafa] p-5 ${serviceTab !== "map-tour" ? "" : "hidden"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-700 uppercase tracking-[0.24em] text-[#8a8a8a]">Feature Preview</div>
                <h3 className="mt-1 text-lg font-700 text-[#1f1f1f]">
                  {serviceTab === "stamp-tour" ? "스탬프 투어" : "대피 훈련"}
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#c40012] shadow-sm">
                <IconClose className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[#8a8a8a]">
              {serviceTab === "stamp-tour"
                ? "스탬프 투어는 아직 연결되지 않았습니다. 데이터와 진행 상태가 준비되면 이 영역에 스탬프 수집, 보상, 진행률 UI가 붙습니다."
                : "대피 훈련은 아직 비활성화 상태입니다. 정책과 연동이 준비되면 시나리오 기반 훈련 UI로 연결합니다."}
            </p>
            <div className="mt-4 rounded-xl border border-white bg-white p-3 text-[13px] text-[#1f1f1f]">
              <div className="font-600">다음 단계</div>
              <ul className="mt-2 space-y-1 text-[#8a8a8a]">
                <li>1. 실제 데이터 스키마 연결</li>
                <li>2. 진행 상태 저장</li>
                <li>3. 모바일/AR 연동</li>
              </ul>
            </div>
          </section>
      </div>
      )}
    </div>
  );
}
