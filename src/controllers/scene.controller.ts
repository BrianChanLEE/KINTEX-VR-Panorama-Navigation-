import { useState, useEffect, useCallback } from "react";
import { SCENES } from "../models/scene.model";

// Note 1: 파노라마 자동 투어 재생 루프 및 브라우저 전체화면 상태, VR Preview 모드 등의 전역 투어 씬 이벤트를 제어합니다.
export function useSceneController(currentSceneId: string, onNavigate: (id: string) => void) {
  const [autoTour, setAutoTour] = useState(false);
  const [diy, setDiy] = useState(false);
  const [vrMode, setVrMode] = useState(false);
  const [fullActive, setFullActive] = useState(false);
  const [hint, setHint] = useState(false);

  // Note 2: 14초 간격으로 전체 씬을 무한 슬라이드 탐색하도록 유도하는 자동 투어 렌더러 타이머 루프입니다.
  useEffect(() => {
    if (!autoTour) return;
    const intervalId = setInterval(() => {
      const idx = SCENES.findIndex((s) => s.id === currentSceneId);
      const nextId = SCENES[(idx + 1) % SCENES.length].id;
      onNavigate(nextId);
    }, 14000);
    return () => clearInterval(intervalId);
  }, [autoTour, currentSceneId, onNavigate]);

  // Note 3: 브라우저 자체의 전체 화면 변경 이벤트 수신을 동기화합니다.
  useEffect(() => {
    const handleFullscreenChange = () => setFullActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Note 4: 브라우저 전체화면 API를 안전하게 발동 및 탈출시킵니다.
  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        document.documentElement.requestFullscreen?.();
      }
    } catch (error) {
      console.warn("Fullscreen toggle failed:", error);
    }
  }, []);

  // Note 5: 튜토리얼 종료 즉시 4.2초 동안 모바일 제스처/드래그 힌트를 보여준 뒤 서서히 숨기는 비즈니스 로직입니다.
  const showDragHint = useCallback(() => {
    setHint(true);
    setTimeout(() => setHint(false), 4200);
  }, []);

  return {
    autoTour,
    setAutoTour,
    diy,
    setDiy,
    vrMode,
    setVrMode,
    fullActive,
    toggleFullscreen,
    hint,
    showDragHint,
  };
}
