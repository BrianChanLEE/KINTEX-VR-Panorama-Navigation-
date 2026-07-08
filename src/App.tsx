// Note 1: React의 주요 훅들을 임포트합니다.
import { useCallback, useEffect, useRef, useState } from "react";
// Note 2: scene 관련 데이터 헬퍼를 임포트합니다.
import { getScene } from "./data/scenes";
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

// Note 8: KINTEX Virtual Tour 애플리케이션의 엔트리 포인트(메인 App 컴포넌트)입니다.
// MVC 패턴의 Controller 컨테이너로서의 역할을 지니며, 상태 훅 바인딩을 주도합니다.
export default function App() {
  // Note 9: 다국어(한국어/영어) 표시용 언어 선택 상태입니다.
  const [lang, setLang] = useState<"KOR" | "ENG">("KOR");
  // Note 10: 튜토리얼 팝업 활성화 여부입니다. Lazy initialization을 사용합니다.
  const [tutorial, setTutorial] = useState(() => !readDismiss());
  // Note 11: 튜토리얼 닫힌 직후 드래그해서 둘러보라는 한시적 안내 말풍선(Hint) 노출 여부입니다.
  const [hint, setHint] = useState(false);
  // Note 12: 모바일 및 웹에서의 VR 가상 듀얼렌즈 뷰 모드 활성화 여부입니다.
  const [vrMode, setVrMode] = useState(false);

  // Note 13: Three.js 기반 PanoramaViewer API(lookAround 등)를 직접 호출하기 위한 Ref 변수입니다.
  const viewerRef = useRef<ViewerHandle>(null);
  // Note 14: 360° 파노라마 뷰어의 회전각(Heading) 데이터를 direct로 관리하는 Ref 객체입니다.
  const headingRef = useRef(0);

  // Note 15: Navigation Controller를 통해 씬 네비게이션 상태와 이동 관련 비즈니스 로직을 관리합니다.
  const nav = useNavigationController("aerial01");

  // Note 16: Info Controller를 통해 정보 탭 선택 서랍 패널의 개폐 상태를 제어합니다.
  const info = useInfoController();

  // Note 17: Scene Controller를 통해 전체 화면 모드 토글 상태 및 자동 투어 루프 타이머 효과를 바인딩합니다.
  const sceneCtl = useSceneController(nav.sceneId, nav.goScene);

  // Note 18: 현재 선택된 씬 ID에 부합하는 Scene 메타데이터 정보를 실시간 계산(Derive state)합니다.
  const scene = getScene(nav.sceneId);

  // Note 19: 현재 씬이 시설 정보 노출 조건을 충족하는지 판단합니다.
  const showInfoTabs = info.checkShowInfoTabs(nav.sceneId);

  // Note 19: 뷰어 내부 정보 핫스팟 클릭 시 시설 일반 정보 탭을 열도록 연결하는 콜백입니다.
  const onInfoHotspot = useCallback((_h: any) => {
    info.setInfoTab("general");
  }, [info]);

  // Note 20: 튜토리얼 팝업을 닫고, 사용자 드래그 힌트를 4.2초 동안 노출시킨 뒤 사라지게 하는 인터랙션 흐름입니다.
  const closeTutorial = useCallback(() => {
    setTutorial(false);
    setHint(true);
    const timer = setTimeout(() => setHint(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  // Note 21: 사용자가 튜토리얼에서 '다시 보지 않기'를 활성화했을 때 로컬 스토리지에 영구 플래그를 저장합니다.
  const dismissForever = useCallback((isDismissed: boolean) => {
    try {
      if (isDismissed) {
        localStorage.setItem(TUTORIAL_KEY, "1");
      }
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
  }, []);

  return (
    <AppView
      sceneId={nav.sceneId}
      scene={scene}
      lang={lang}
      tutorial={tutorial}
      infoTab={info.infoTab}
      autoTour={sceneCtl.autoTour}
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
      toggleFullscreen={sceneCtl.toggleFullscreen}
      closeTutorial={closeTutorial}
      dismissForever={dismissForever}
      exitVR={() => setVrMode(false)}
    />
  );
}
