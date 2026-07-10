import type { Scene } from "../models/scene.model";
import type { InfoTab } from "../models/info.model";
import FloorSelector from "../components/FloorSelector";
import InfoPanel from "../components/InfoPanel";
import InfoTabs from "../components/InfoTabs";
import KintexLogo from "../components/KintexLogo";
import MiniMap from "../components/MiniMap";
import PanoramaViewer, { type ViewerHandle } from "../components/PanoramaViewer";
import SceneDropdown from "../components/SceneDropdown";
import SearchPanel from "../components/SearchPanel";
import TopNav from "../components/TopNav";
import TutorialOverlay from "../components/TutorialOverlay";
import VRControls from "../components/VRControls";
import VRHardwarePromptView from "./VRHardwarePromptView";

interface AppViewProps {
  sceneId: string;
  scene: Scene;
  lang: "KOR" | "ENG";
  tutorial: boolean;
  infoTab: InfoTab | null;
  autoTour: boolean;
  diy: boolean;
  vrMode: boolean;
  fullActive: boolean;
  hint: boolean;
  showInfoTabs: boolean;

  viewerRef: React.RefObject<ViewerHandle>;
  headingRef: React.MutableRefObject<number>;

  // Handlers
  setLang: (lang: "KOR" | "ENG") => void;
  goScene: (id: string) => void;
  goZone: (zone: any) => void;
  onInfoHotspot: (h: any) => void;
  toggleInfoTab: (t: InfoTab) => void;
  setInfoTab: (t: InfoTab | null) => void;
  setVrMode: (fn: (v: boolean) => boolean) => void;
  isPresenting: boolean;
  setIsPresenting: (v: boolean) => void;
  toggleFullscreen: () => void;
  closeTutorial: () => void;
  dismissForever: (v: boolean) => void;
  exitVR: () => void;

  highlightedHotspotId: string | null;
  activeTour: "exhibition" | "safety" | null;
  setActiveTour: (tour: "exhibition" | "safety" | null) => void;
  setTourStep: (step: number) => void;
  tourSubtitle: string;
  onSelectSearchResult: (sceneId: string, hotspot?: any) => void;
  vrHardwarePromptVisible: boolean;
  dismissVrHardwarePrompt: () => void;
  onVrHardwareUnavailable: () => void;
}

// Note 1: AppView는 전체 레이아웃 구조 디자인 및 자식 컴포넌트 조합만을 담당하는 최상위 뷰 컴포넌트입니다.
export default function AppView({
  sceneId,
  scene,
  lang,
  tutorial,
  infoTab,
  autoTour,
  diy,
  vrMode,
  fullActive,
  hint,
  showInfoTabs,
  viewerRef,
  headingRef,
  setLang,
  goScene,
  goZone,
  onInfoHotspot,
  toggleInfoTab,
  setInfoTab,
  setVrMode,
  isPresenting,
  setIsPresenting,
  toggleFullscreen,
  closeTutorial,
  dismissForever,
  exitVR,
  highlightedHotspotId,
  activeTour,
  setActiveTour,
  setTourStep,
  tourSubtitle,
  onSelectSearchResult,
  vrHardwarePromptVisible,
  dismissVrHardwarePrompt,
  onVrHardwareUnavailable,
}: AppViewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* 360 viewer */}
      <PanoramaViewer
        ref={viewerRef}
        scene={scene}
        autoRotate={autoTour}
        showHotspots={!diy}
        headingRef={headingRef}
        onNavigate={goScene}
        onInfo={onInfoHotspot}
        lang={lang}
        activeTab={infoTab}
        highlightedHotspotId={highlightedHotspotId}
        vrMode={vrMode}
        setVrMode={setVrMode}
        onXrActiveChange={setIsPresenting}
        onVrHardwareUnavailable={onVrHardwareUnavailable}
      />

      {/* VR Mode일 때는 2D HTML UI 패널들을 완전히 가려 브라우저 연산 최소화 및 몰입감 보장 */}
      <div className={vrMode ? "hidden pointer-events-none" : ""}>
        {/* TopNav — iframe 상단 내비바 */}
        <TopNav lang={lang} onLang={setLang} onHome={() => goScene("aerial01")} />

        {/* top-left: KINTEX 로고 배지 */}
        <KintexLogo />

        {/* top-left 아래: 씬 리스트 드롭다운 */}
        <SceneDropdown currentId={sceneId} onSelect={goScene} />

        {/* 통합 검색창 */}
        <SearchPanel lang={lang} onSelectResult={onSelectSearchResult} />

        {/* 가이드 투어 제어 바 (상단 우측) */}
        <div 
          className="absolute top-[82px] right-[80px] z-30 flex items-center gap-2"
          style={{ pointerEvents: "auto" }}
        >
          {activeTour ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black/80 px-3.5 py-1.5 backdrop-blur-md shadow-lg animate-pulse">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-white">
                {activeTour === "safety" ? "대피 가이드 실행 중" : "전시 투어 실행 중"}
              </span>
              <button
                onClick={() => {
                  setActiveTour(null);
                  setTourStep(0);
                }}
                className="ml-2 rounded-full bg-rose-600 hover:bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white transition active:scale-95"
              >
                종료 (Stop)
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTour("exhibition");
                  setTourStep(0);
                }}
                className="rounded-full border border-zinc-200/80 bg-white/90 hover:bg-white px-3.5 py-1.5 text-[11px] font-bold text-zinc-800 backdrop-blur-md shadow-lg transition active:scale-95"
              >
                🎙️ 전시 투어 시작
              </button>
              <button
                onClick={() => {
                  setActiveTour("safety");
                  setTourStep(0);
                }}
                className="rounded-full border border-red-500/20 bg-red-600/90 hover:bg-red-600 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md shadow-lg transition active:scale-95"
              >
                🚨 대피 훈련 시작
              </button>
            </div>
          )}
        </div>

        {/* 가이드 투어 자막 레이어 */}
        {tourSubtitle && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[560px] max-w-[90%] bg-zinc-950/90 border border-white/10 rounded-2xl p-4 text-center shadow-2xl backdrop-blur-md animate-floaty">
            <div className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase mb-1">
              {activeTour === "safety" ? "🚨 안전 대피 안내방송" : "🎙️ KINTEX 도슨트 가이드"}
            </div>
            <p className="text-xs font-semibold text-white leading-relaxed">{tourSubtitle}</p>
          </div>
        )}

        {/* right-center: 구역/층 선택 사이드바 */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-30">
          <FloorSelector currentZone={scene.zone} onSelectZone={goZone} />
        </div>

        {/* bottom-left: 시설 분류 탭 */}
        <InfoTabs activeTab={infoTab} onSelect={toggleInfoTab} visible={showInfoTabs} />

        {/* bottom-right: 나침반 미니맵 */}
        <div className="absolute right-4 bottom-28 z-30">
          <MiniMap
            scene={scene}
            headingRef={headingRef}
            onZoomIn={() => viewerRef.current?.zoomIn()}
            onZoomOut={() => viewerRef.current?.zoomOut()}
            onReset={() => viewerRef.current?.resetView()}
            highlightedHotspotId={highlightedHotspotId}
          />
        </div>

        {/* bottom-right: VR 제어 버튼들 */}
        <VRControls
          vrActive={vrMode}
          fullActive={fullActive}
          onVR={() => {
            if (!vrMode) {
              console.log("[VR Click] user gesture received");
              viewerRef.current?.enterVR();
            } else {
              setVrMode((v) => !v);
            }
          }}
          onFullscreen={toggleFullscreen}
          onLook={() => viewerRef.current?.lookAround()}
        />

        {/* facility detail drawer */}
        <InfoPanel
          open={infoTab !== null}
          sceneId={sceneId}
          tab={infoTab ?? "general"}
          onTab={setInfoTab}
          onClose={() => setInfoTab(null)}
          lang={lang}
        />

        {/* drag hint */}
        <div
          className={`pointer-events-none absolute left-1/2 top-[46%] z-20 -translate-x-1/2 transition-all duration-700 ${
            hint ? "opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2.5 rounded-full px-4 py-2 bg-black/60 text-white/85 text-sm backdrop-blur-sm">
            <span className="animate-floaty text-lg">↔</span>
            드래그하여 360° 둘러보기
          </div>
        </div>
      </div>

      {/* VR goggle frame */}
      {vrMode && !isPresenting && <VRFrame onExit={exitVR} />}

      {/* XR 하드웨어 안내 */}
      {vrHardwarePromptVisible && (
        <VRHardwarePromptView onDismiss={dismissVrHardwarePrompt} />
      )}

      {/* tutorial */}
      {tutorial && (
        <TutorialOverlay onClose={closeTutorial} onDismissForever={dismissForever} />
      )}
    </div>
  );
}

// Note 2: VR 안경의 눈 2개를 순회하기 위한 정적 상수 배열입니다.
const CARDINAL_DIRECTIONS_VR = [0, 1] as const;

interface VRFrameProps {
  onExit: () => void;
}

// Note 3: VR 안경 글래스 모양을 에뮬레이트하는 오버레이 컴포넌트입니다.
function VRFrame({ onExit }: VRFrameProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[25]">
      {/* 듀얼 아이 홀 렌더링 */}
      <div className="absolute inset-0 flex items-center justify-center gap-6">
        {CARDINAL_DIRECTIONS_VR.map((i) => (
          <div
            key={i}
            className="aspect-square h-[70vmin] rounded-full border-2 border-white/10"
            style={{ boxShadow: "0 0 0 9999px rgba(3,6,10,0.55)" }}
          />
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-black/40" />
      <div className="pointer-events-auto absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-sm text-white/80 backdrop-blur">
        VR 미리보기 모드
        <button
          type="button"
          onClick={onExit}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/25 hover:bg-white/10"
          aria-label="exit vr"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
