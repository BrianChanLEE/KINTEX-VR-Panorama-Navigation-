// Note 1: React의 주요 훅들을 임포트합니다.
import { useCallback, useEffect, useRef, useState } from "react";
// Note 2: scene 관련 데이터 헬퍼를 임포트합니다.
import { getScene } from "./data/scenes";
import { initConsoleHook } from "./utils/debugLogger";
import DebugOverlay from "./components/DebugOverlay";
import MinimalXrScene from "./components/MinimalXrScene";
// Note 3: MVC Controllers에서 상태 관리 비즈니스 로직 훅들을 임포트합니다.
import { useNavigationController } from "./controllers/navigation.controller";
import { useSceneController } from "./controllers/scene.controller";
// Note 4: 뷰어 기능 제어에 사용되는 ViewerHandle 타입입니다.
import type { ViewerHandle } from "./components/PanoramaViewer";
// Note 5: UI 구조 및 레이아웃 렌더링 책임을 분리하여 처리하기 위해 AppView 컴포넌트를 임포트합니다.
import AppView from "./views/AppView";

// Note 6: 브라우저 로컬 스토리지에 사용자의 튜토리얼 닫기(Dismiss) 상태를 저장하기 위한 정적 키(Key) 값 선언입니다.
const TUTORIAL_KEY = "kmice_hide_tutorial";

// Note 7: 사용자가 예전에 '다시 보지 않기'를 선택했는지 로컬 스토리지로부터 복원하는 안전한 헬퍼 함수입니다.
const readDismiss = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
};

// Note 8: KINTEX Virtual Tour 애플리케이션의 엔트리 포인트(메인 App 컴포넌트)입니다.
export default function App() {
  // 앱 기동 초기 시점에 전역 console.log/warn/error hook 활성화
  useEffect(() => {
    initConsoleHook();
  }, []);

  const [lang, setLang] = useState<"KOR" | "ENG">("KOR");
  const [tutorial, setTutorial] = useState(() => !readDismiss());
  const [hint, setHint] = useState(false);
  const [vrMode, setVrMode] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [vrHardwarePromptVisible, setVrHardwarePromptVisible] = useState(false);
  const [panoramaLoading, setPanoramaLoading] = useState(false);

  // 통합 검색 하이라이트 핫스팟 ID 상태
  const [highlightedHotspotId, setHighlightedHotspotId] = useState<string | null>(null);

  const viewerRef = useRef<ViewerHandle>(null);
  const headingRef = useRef(0);

  const nav = useNavigationController("aerial01");
  const sceneCtl = useSceneController(nav.sceneId, nav.goScene);
  const scene = getScene(nav.sceneId);

  const closeTutorial = useCallback(() => {
    setTutorial(false);
    setHint(true);
    const timer = setTimeout(() => setHint(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  const dismissForever = useCallback((isDismissed: boolean) => {
    try {
      if (isDismissed) {
        localStorage.setItem(TUTORIAL_KEY, "1");
      }
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
  }, []);

  useEffect(() => {
    if (isPresenting) {
      setVrHardwarePromptVisible(false);
    }
  }, [isPresenting]);

  // 통합 검색 선택 결과 이동 핸들러
  const handleSelectSearchResult = useCallback((sceneId: string, hotspot?: any) => {
    nav.goScene(sceneId);
    
    if (hotspot) {
      setHighlightedHotspotId(hotspot.id);
      
      const lookTimer = setTimeout(() => {
        viewerRef.current?.lookAtPosition(hotspot.lon, hotspot.lat);
      }, 500);

      const clearTimer = setTimeout(() => {
        setHighlightedHotspotId(null);
      }, 6000);

      return () => {
        clearTimeout(lookTimer);
        clearTimeout(clearTimer);
      };
    } else {
      setHighlightedHotspotId(null);
    }
  }, [nav]);

  return (
    <>
    <AppView
      sceneId={nav.sceneId}
      scene={scene}
      lang={lang}
      tutorial={tutorial}
      autoTour={sceneCtl.autoTour}
      diy={sceneCtl.diy}
      vrMode={vrMode}
      fullActive={sceneCtl.fullActive}
      hint={hint}
      viewerRef={viewerRef}
      headingRef={headingRef}
      setLang={setLang}
      goScene={nav.goScene}
      goZone={nav.goZone}
      setVrMode={setVrMode}
      isPresenting={isPresenting}
      setIsPresenting={setIsPresenting}
      toggleFullscreen={sceneCtl.toggleFullscreen}
      closeTutorial={closeTutorial}
      dismissForever={dismissForever}
      exitVR={() => {
        setVrMode(false);
        setIsPresenting(false);
      }}
      
      highlightedHotspotId={highlightedHotspotId}
      onSelectSearchResult={handleSelectSearchResult}
      vrHardwarePromptVisible={vrHardwarePromptVisible}
      dismissVrHardwarePrompt={() => setVrHardwarePromptVisible(false)}
      onVrHardwareUnavailable={() => setVrHardwarePromptVisible(true)}
      panoramaLoading={panoramaLoading}
      setPanoramaLoading={setPanoramaLoading}
    />
    {import.meta.env.VITE_DEBUG_OVERLAY === "true" && <DebugOverlay />}
    </>
  );
}
