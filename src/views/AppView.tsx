import type { Scene } from "../models/scene.model";
import type { InfoTab } from "../models/info.model";
import FloorSelector from "../components/FloorSelector";
import InfoPanel from "../components/InfoPanel";
import InfoTabs from "../components/InfoTabs";
import KintexLogo from "../components/KintexLogo";
import PanoramaViewer, { type ViewerHandle } from "../components/PanoramaViewer";
import SceneDropdown from "../components/SceneDropdown";
import TopNav from "../components/TopNav";
import TutorialOverlay from "../components/TutorialOverlay";
import VRControls from "../components/VRControls";

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
  toggleFullscreen: () => void;
  closeTutorial: () => void;
  dismissForever: (v: boolean) => void;
  exitVR: () => void;
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
  toggleFullscreen,
  closeTutorial,
  dismissForever,
  exitVR,
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
      />

      {/* TopNav — iframe 상단 내비바 */}
      <TopNav lang={lang} onLang={setLang} onHome={() => goScene("aerial01")} />

      {/* top-left: KINTEX 로고 배지 */}
      <KintexLogo />

      {/* top-left 아래: 씬 리스트 드롭다운 */}
      <SceneDropdown currentId={sceneId} onSelect={goScene} />

      {/* right-center: 구역/층 선택 사이드바 */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-30">
        <FloorSelector currentZone={scene.zone} onSelectZone={goZone} />
      </div>

      {/* bottom-left: 시설 분류 탭 */}
      <InfoTabs activeTab={infoTab} onSelect={toggleInfoTab} visible={showInfoTabs} />

      {/* bottom-right: VR 제어 버튼들 */}
      <VRControls
        vrActive={vrMode}
        fullActive={fullActive}
        onVR={() => setVrMode((v) => !v)}
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

      {/* VR goggle frame */}
      {vrMode && <VRFrame onExit={exitVR} />}

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
