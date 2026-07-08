// Note 1: React 훅 및 공통 데이터 서비스를 임포트합니다.
import { useState } from "react";
import { sceneService } from "../services/scene.service";
import SceneDropdownView from "../views/SceneDropdownView";

interface SceneDropdownProps {
  currentId: string;
  onSelect: (id: string) => void;
}

// Note 2: SceneDropdown 컴포넌트는 Controller 역할을 수행하여 드롭다운 열림 상태와 현재 선택된 씬 객체를 중개합니다.
export default function SceneDropdown({
  currentId,
  onSelect,
}: SceneDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = sceneService.getScene(currentId);

  return (
    <SceneDropdownView
      open={open}
      setOpen={setOpen}
      current={current}
      currentId={currentId}
      onSelect={onSelect}
    />
  );
}


