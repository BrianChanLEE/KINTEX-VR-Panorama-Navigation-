// Note 1: React의 훅들을 임포트합니다.
import { useEffect, useRef } from "react";
// Note 2: scene 타입과 MiniMapView 컴포넌트를 가져옵니다.
import type { Scene, Hotspot } from "../models/scene.model";
import MiniMapView from "../views/MiniMapView";
import addedHotspotsData from "../data/added-hotspots.json";

interface MiniMapProps {
  scene: Scene;
  headingRef: React.MutableRefObject<number>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  highlightedHotspotId?: string | null;
}

export default function MiniMap({
  scene,
  headingRef,
  onZoomIn,
  onZoomOut,
  onReset,
  highlightedHotspotId,
}: MiniMapProps) {
  const coneRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const beaconRef = useRef<HTMLDivElement>(null);

  // 현재 씬의 모든 핫스팟 (정적 + 동적 추가) 중에서 하이라이트 대상의 각도(lon) 추출
  const currentAdded = (addedHotspotsData as Record<string, Hotspot[]>)[scene.id] || [];
  const allHotspots = [...scene.hotspots, ...currentAdded];
  const targetHotspot = allHotspots.find((h) => h.id === highlightedHotspotId);
  const targetLon = targetHotspot ? targetHotspot.lon : null;

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

      if (beaconRef.current) {
        if (targetLon !== null) {
          beaconRef.current.style.display = "block";
          // 나침반 프레임 회전에 따른 상대 각도 계산
          beaconRef.current.style.transform = `translate(-50%, -50%) rotate(${targetLon - heading}deg)`;
        } else {
          beaconRef.current.style.display = "none";
        }
      }
    };
    tick();

    return () => cancelAnimationFrame(rafId);
  }, [headingRef, targetLon]);

  return (
    <MiniMapView
      scene={scene}
      coneRef={coneRef}
      ringRef={ringRef}
      beaconRef={beaconRef}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      onReset={onReset}
    />
  );
}
