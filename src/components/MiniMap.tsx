// Note 1: React의 훅들을 임포트합니다.
import { useEffect, useRef } from "react";
// Note 2: scene 타입과 MiniMapView 컴포넌트를 가져옵니다.
import type { Scene } from "../models/scene.model";
import MiniMapView from "../views/MiniMapView";

interface MiniMapProps {
  scene: Scene;
  headingRef: React.MutableRefObject<number>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

// Note 3: MiniMap 컴포넌트는 Controller 역할을 맡아, headingRef의 매 프레임 변화량을 감시하고
// requestAnimationFrame 루프를 제어하며 DOM ref 속성을 MiniMapView에 맵핑해 줍니다.
export default function MiniMap({
  scene,
  headingRef,
  onZoomIn,
  onZoomOut,
  onReset,
}: MiniMapProps) {
  const coneRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Note 4: 뷰어의 연속적 회전을 UI 캔버스에 실시간 투사하기 위한 requestAnimationFrame 핸들러 루프입니다.
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const heading = headingRef.current;

      if (coneRef.current) {
        coneRef.current.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `rotate(${-heading}deg)`;
      }
    };
    tick();

    return () => cancelAnimationFrame(rafId);
  }, [headingRef]);

  return (
    <MiniMapView
      scene={scene}
      coneRef={coneRef}
      ringRef={ringRef}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      onReset={onReset}
    />
  );
}
