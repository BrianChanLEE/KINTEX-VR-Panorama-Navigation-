import { useCallback, useState } from "react";
import type { InfoTab } from "../models/info.model";
import { sceneService } from "../services/scene.service";

// Note 1: 상세 시설정보(일반/안전/공간) 패널 서랍 및 하단 탭의 제어를 전담하는 Info Controller입니다.
export function useInfoController() {
  const [infoTab, setInfoTab] = useState<InfoTab | null>(null);

  // Note 2: 이미 켜진 탭 재선택 시 닫기, 신규 선택 시 열기 상태 토글 콜백입니다.
  const toggleInfoTab = useCallback((tab: InfoTab) => {
    setInfoTab((cur) => (cur === tab ? null : tab));
  }, []);

  // Note 3: 특정 씬 아이디를 받아 해당 씬이 상세 정보를 보여줄 수 있는지 체크하는 유틸리티적 로직 연산입니다.
  const checkShowInfoTabs = useCallback((sceneId: string): boolean => {
    return sceneService.shouldShowInfoPanel(sceneId);
  }, []);

  return {
    infoTab,
    setInfoTab,
    toggleInfoTab,
    checkShowInfoTabs,
  };
}
