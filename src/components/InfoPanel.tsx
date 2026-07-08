// Note 1: 정보 탭 유니온 타입을 모델 폴더 경로에서 임포트합니다.
import type { InfoTab } from "../models/info.model";
// Note 2: UI 렌더링 책임을 위임하기 위해 InfoPanelView 컴포넌트를 임포트합니다.
import InfoPanelView from "../views/InfoPanelView";

interface InfoPanelProps {
  open: boolean;
  sceneId: string;
  tab: InfoTab;
  onTab: (tab: InfoTab) => void;
  onClose: () => void;
  lang: "KOR" | "ENG";
}

// Note 3: InfoPanel 컴포넌트는 비즈니스 상태를 받아 InfoPanelView를 중개하는 컨트롤러 역할을 담당합니다.
export default function InfoPanel({
  open,
  sceneId,
  tab,
  onTab,
  onClose,
  lang,
}: InfoPanelProps) {
  return (
    <InfoPanelView
      open={open}
      sceneId={sceneId}
      tab={tab}
      onTab={onTab}
      onClose={onClose}
      lang={lang}
    />
  );
}


