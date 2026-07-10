// Note 1: React의 주요 훅들을 임포트합니다.
import { useCallback, useEffect, useRef, useState } from "react";
// Note 2: scene 관련 데이터 헬퍼를 임포트합니다.
import { getScene } from "./data/scenes";
import { initConsoleHook } from "./utils/debugLogger";
import DebugOverlay from "./components/DebugOverlay";
import MinimalXrScene from "./components/MinimalXrScene";
// Note 3: MVC Controllers에서 상태 관리 비즈니스 로직 훅들을 임포트합니다.
import { useNavigationController } from "./controllers/navigation.controller";
import { useInfoController } from "./controllers/info.controller";
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

const TOUR_COURSES = {
  exhibition: [
    { sceneId: "aerial01", ath: 350, atv: -5, duration: 6500, ko: "킨텍스 항공 뷰입니다. 제1전시장으로 입장을 시작합니다.", en: "Welcome to KINTEX. Let's enter Exhibition Center 1." },
    { sceneId: "gate1a", ath: 5, atv: 6, duration: 6500, ko: "1전시장 앞 Gate 1A 광장입니다. 로비 내부로 진입합니다.", en: "This is Gate 1A plaza. We are heading into the lobby." },
    { sceneId: "lobby12", ath: 270, atv: 0, duration: 7500, ko: "전시1,2홀 앞 메인 로비입니다. 넓고 쾌적한 안내 시설이 완비되어 있습니다.", en: "Exhibition Hall 1-2 Lobby. Full information facilities are available." },
    { sceneId: "hall1", ath: 271, atv: 0, duration: 6500, ko: "웅장한 제1전시장 내부 홀입니다. 이것으로 전시 가이드 투어를 종료합니다.", en: "Inside Exhibition Hall 1. This concludes our standard guide tour." },
  ],
  safety: [
    { sceneId: "lobby12", ath: 270, atv: 0, duration: 7000, ko: "비상 대피로 투어를 시작합니다. 현재 1층 로비 소화전 위치를 확인하세요.", en: "Starting safety escape tour. Locate the fire hydrant in the lobby." },
    { sceneId: "gate1a", ath: 134, atv: 14, duration: 7000, ko: "화재 시 비상 탈출구를 통해 즉시 실외 광장 대피처로 집결하십시오.", en: "In case of fire, evacuate immediately to the outdoor plaza escape area." },
    { sceneId: "aerial01", ath: 350, atv: -5, duration: 6000, ko: "안전하게 실외 대피처로 집결을 마쳤습니다. 대피 훈련을 종료합니다.", en: "Successfully evacuated to the assembly point. Safety drill is complete." },
  ]
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

  // 통합 검색 하이라이트 핫스팟 ID 상태
  const [highlightedHotspotId, setHighlightedHotspotId] = useState<string | null>(null);

  // 자동 가이드 투어 상태
  const [activeTour, setActiveTour] = useState<"exhibition" | "safety" | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [tourSubtitle, setTourSubtitle] = useState("");

  const viewerRef = useRef<ViewerHandle>(null);
  const headingRef = useRef(0);

  const nav = useNavigationController("aerial01");
  const info = useInfoController();
  const sceneCtl = useSceneController(nav.sceneId, nav.goScene);
  const scene = getScene(nav.sceneId);
  const showInfoTabs = info.checkShowInfoTabs(nav.sceneId);

  const onInfoHotspot = useCallback((_h: any) => {
    info.setInfoTab("general");
  }, [info]);

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

  // 가이드 투어 라이프사이클 처리 효과
  useEffect(() => {
    if (!activeTour) {
      setTourSubtitle("");
      return;
    }

    const course = TOUR_COURSES[activeTour];
    if (tourStep >= course.length) {
      setActiveTour(null);
      setTourStep(0);
      setTourSubtitle("");
      return;
    }

    const step = course[tourStep];
    nav.goScene(step.sceneId);
    setTourSubtitle(lang === "KOR" ? step.ko : step.en);

    const lookTimer = setTimeout(() => {
      viewerRef.current?.lookAtPosition(step.ath, step.atv);
    }, 650);

    const stepTimer = setTimeout(() => {
      setTourStep((s) => s + 1);
    }, step.duration);

    return () => {
      clearTimeout(lookTimer);
      clearTimeout(stepTimer);
    };
  }, [activeTour, tourStep, lang, nav]);

  return (
    <>
    <AppView
      sceneId={nav.sceneId}
      scene={scene}
      lang={lang}
      tutorial={tutorial}
      infoTab={info.infoTab}
      autoTour={sceneCtl.autoTour && !activeTour} // 가이드 투어 시에는 일반 자동 회전 비활성화
      diy={sceneCtl.diy}
      vrMode={vrMode}
      fullActive={sceneCtl.fullActive}
      hint={hint}
      showInfoTabs={showInfoTabs}
      viewerRef={viewerRef}
      headingRef={headingRef}
      setLang={setLang}
      goScene={nav.goScene}
      goZone={nav.goZone}
      onInfoHotspot={onInfoHotspot}
      toggleInfoTab={info.toggleInfoTab}
      setInfoTab={info.setInfoTab}
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
      
      // 검색 및 가이드 투어 상태 바인딩
      highlightedHotspotId={highlightedHotspotId}
      activeTour={activeTour}
      setActiveTour={setActiveTour}
      setTourStep={setTourStep}
      tourSubtitle={tourSubtitle}
      onSelectSearchResult={handleSelectSearchResult}
      vrHardwarePromptVisible={vrHardwarePromptVisible}
      dismissVrHardwarePrompt={() => setVrHardwarePromptVisible(false)}
      onVrHardwareUnavailable={() => setVrHardwarePromptVisible(true)}
    />
    {import.meta.env.VITE_DEBUG_OVERLAY === "true" && <DebugOverlay />}
    </>
  );
}
