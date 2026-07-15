import type { Scene } from "../models/scene.model";
import FloorSelector from "../components/FloorSelector";
import SiC27Logo from "../components/SiC27Logo";
import MiniMap from "../components/MiniMap";
import PanoramaViewer, { type ViewerHandle } from "../components/PanoramaViewer";
import SceneDropdown from "../components/SceneDropdown";
import SearchPanel from "../components/SearchPanel";
import ServiceMenu from "../components/ServiceMenu";
import TopNav from "../components/TopNav";
import TutorialOverlay from "../components/TutorialOverlay";
import VRControls from "../components/VRControls";
import VRHardwarePromptView from "./VRHardwarePromptView";
import { useServiceMenuController } from "../controllers/serviceMenu.controller";

interface AppViewProps {
  sceneId: string;
  scene: Scene;
  lang: "KOR" | "ENG";
  tutorial: boolean;
  autoTour: boolean;
  diy: boolean;
  vrMode: boolean;
  fullActive: boolean;
  hint: boolean;

  viewerRef: React.RefObject<ViewerHandle>;
  headingRef: React.MutableRefObject<number>;

  // Handlers
  setLang: (lang: "KOR" | "ENG") => void;
  goScene: (id: string) => void;
  goZone: (zone: any) => void;
  setVrMode: (fn: (v: boolean) => boolean) => void;
  isPresenting: boolean;
  setIsPresenting: (v: boolean) => void;
  toggleFullscreen: () => void;
  closeTutorial: () => void;
  dismissForever: (v: boolean) => void;
  exitVR: () => void;

  highlightedHotspotId: string | null;
  onSelectSearchResult: (sceneId: string, hotspot?: any) => void;
  vrHardwarePromptVisible: boolean;
  dismissVrHardwarePrompt: () => void;
  onVrHardwareUnavailable: () => void;
  panoramaLoading: boolean;
  setPanoramaLoading: (loading: boolean) => void;
}

// Note 1: AppView는 전체 레이아웃 구조 디자인 및 자식 컴포넌트 조합만을 담당하는 최상위 뷰 컴포넌트입니다.
export default function AppView({
  sceneId,
  scene,
  lang,
  tutorial,
  autoTour,
  diy,
  vrMode,
  fullActive,
  hint,
  viewerRef,
  headingRef,
  setLang,
  goScene,
  goZone,
  setVrMode,
  isPresenting,
  setIsPresenting,
  toggleFullscreen,
  closeTutorial,
  dismissForever,
  exitVR,
  highlightedHotspotId,
  onSelectSearchResult,
  vrHardwarePromptVisible,
  dismissVrHardwarePrompt,
  onVrHardwareUnavailable,
  panoramaLoading,
  setPanoramaLoading,
}: AppViewProps) {
  const mapTourController = useServiceMenuController(scene);

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
        onInfo={() => undefined}
        lang={lang}
        activeTab={null}
        highlightedHotspotId={highlightedHotspotId}
        vrMode={vrMode}
        setVrMode={setVrMode}
        onXrActiveChange={setIsPresenting}
        onVrHardwareUnavailable={onVrHardwareUnavailable}
        onLoadingChange={setPanoramaLoading}
        mapTourSelection={mapTourController.selection}
      />

      {/* VR/2D 공통 파노라마 로딩 오버레이 */}
      {panoramaLoading && !vrMode && (
        <div className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center bg-[#0d151d]/95">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin-slow rounded-full border-2 border-white/15 border-t-kx-bright" />
            <span className="font-cond text-xs uppercase tracking-[0.35em] text-white/50">Loading panorama</span>
          </div>
        </div>
      )}

      {/* VR Mode일 때는 2D HTML UI 패널들을 완전히 가려 브라우저 연산 최소화 및 몰입감 보장 */}
      <div className={vrMode ? "hidden pointer-events-none" : ""}>
        {/* TopNav — iframe 상단 내비바 */}
        <TopNav lang={lang} onLang={setLang} onHome={() => goScene("aerial01")} />

        {/* top-left: SiC27Logo 로고 배지 */}
        <SiC27Logo />

        {/* top-left 아래: 씬 리스트 드롭다운 */}
        <SceneDropdown currentId={sceneId} onSelect={goScene} />

        {/* 통합 검색창 */}
        <SearchPanel lang={lang} onSelectResult={onSelectSearchResult} />

        {/* right-center: 구역/층 선택 사이드바 */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-30">
          <FloorSelector currentZone={scene.zone} onSelectZone={goZone} />
        </div>

        {/* bottom-left: 서비스 메뉴 */}
        <ServiceMenu
          scene={scene}
          serviceTab={mapTourController.serviceTab}
          menuCollapsed={mapTourController.menuCollapsed}
          selection={mapTourController.selection}
          onSelectTab={mapTourController.selectTab}
          onToggleCollapsed={mapTourController.toggleMenuCollapsed}
          onSelectExhibition={mapTourController.selectExhibition}
          onSelectFloor={mapTourController.selectFloor}
          onSelectDestination={mapTourController.selectDestination}
          onStartNavigation={mapTourController.startNavigation}
          onResetNavigation={mapTourController.resetNavigation}
        />

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
