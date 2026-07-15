import { useState, useRef, useEffect, useCallback } from "react";
import type * as THREE from "three";
import hotspotOverridesData from "../data/hotspot-position-overrides.json";
import addedHotspotsData from "../data/added-hotspots.json";
import type { Hotspot, HotspotOverride } from "../models/hotspot.model";
import type { InteractionMode, ToastModel } from "../models/editor.model";
import { overrideService } from "../services/override.service";
import { panoramaProjection } from "../utils/panoramaProjection";
import { guards } from "../utils/guards";

// Note 1: 핫스팟의 에디팅 제어(드래그 수정, 저장, 테스트, 초기화) 상태를 도맡는 Editor Controller입니다.
export function useEditorController(
  sceneId: string,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | undefined>,
  hotspotLayerRef: React.MutableRefObject<HTMLDivElement | null>
) {
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("drag");
  const [overrides, setOverrides] = useState<Record<string, any>>(hotspotOverridesData);
  const [addedHotspots, setAddedHotspots] = useState<Record<string, Hotspot[]>>(addedHotspotsData as Record<string, Hotspot[]>);
  const [selectedHotspot, setSelectedHotspot] = useState<{ hotspot: Hotspot; index: number } | null>(null);
  const [toast, setToast] = useState<ToastModel | null>(null);

  const isDraggingHotspotRef = useRef(false);
  const draggingHotspotInfoRef = useRef<{ hotspot: Hotspot; index: number } | null>(null);
  const overridesRef = useRef(overrides);

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  // 토스트 노출 시간 제어 타이머 트리거
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Note 2: 키보드 'D', 'C', 'A' 단축키를 처리하여 드래그/클릭/추가 모드 신속 전환 분기를 수행합니다.
  const handleEditorKeyDown = useCallback((e: KeyboardEvent) => {
    if (guards.isTextInput(e.target)) return;
    
    if (e.key.toLowerCase() === "d") {
      setInteractionMode("drag");
      setToast({ message: "Mode: Edit", type: "success" });
    } else if (e.key.toLowerCase() === "c") {
      setInteractionMode("click");
      setToast({ message: "Mode: Click Test", type: "success" });
    } else if (e.key.toLowerCase() === "a") {
      setInteractionMode("add");
      setToast({ message: "Mode: Add Hotspot. Click on panorama to place.", type: "success" });
    }
  }, []);

  // Note 3: 마우스/포인터 드래그 시작 이벤트 핸들러입니다.
  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>, h: Hotspot, index: number) => {
    if (interactionMode !== "drag") return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingHotspotRef.current = true;
    draggingHotspotInfoRef.current = { hotspot: h, index };
    setSelectedHotspot({ hotspot: h, index });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [interactionMode]);

  // Note 4: 핫스팟 드래그 중 실시간 구면 위도(atv/lat) 및 경도(ath/lon) 투영 계산 핸들러입니다.
  const handleDrag = useCallback((e: React.PointerEvent<HTMLDivElement>, h: Hotspot, index: number) => {
    if (interactionMode !== "drag") return;
    if (!isDraggingHotspotRef.current || draggingHotspotInfoRef.current?.index !== index) return;
    e.preventDefault();
    e.stopPropagation();

    const layer = hotspotLayerRef.current;
    const camera = cameraRef.current;
    if (!layer || !camera) return;

    // Note 5: 투영 변환 유틸리티를 호출하여 클릭 위치의 구면 좌표 및 로컬 스크린 오프셋을 역추적합니다.
    const coords = panoramaProjection.calculateSphericalCoordinates(
      e.clientX,
      e.clientY,
      layer,
      camera
    );

    const newOverrides = {
      ...overridesRef.current,
      [sceneId]: {
        ...(overridesRef.current[sceneId] || {}),
        [h.id || h.label]: {
          ath: coords.lon,
          atv: coords.lat,
          screenOffsetX: coords.localX,
          screenOffsetY: coords.localY,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    setOverrides(newOverrides);
  }, [sceneId, cameraRef, hotspotLayerRef, interactionMode]);

  // Note 6: 드래그 종료 및 포인터 캡처 해제 핸들러입니다.
  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>, _h: Hotspot, index: number) => {
    if (interactionMode !== "drag") return;
    if (!isDraggingHotspotRef.current || draggingHotspotInfoRef.current?.index !== index) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingHotspotRef.current = false;
    draggingHotspotInfoRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [interactionMode]);

  // Note 7: 디스크 overrides 파일에 좌표 변경 정보를 최종 보존하는 비즈니스 콜백입니다.
  const handleSave = useCallback(async (patch?: Partial<HotspotOverride>) => {
    if (!selectedHotspot) return;
    const h = selectedHotspot.hotspot;
    const sceneOverrides = overrides[sceneId] || {};
    const override = sceneOverrides[h.id || h.label];
    const resolvedOverride = override || {
      ath: h.lon,
      atv: h.lat,
      screenOffsetX: 0,
      screenOffsetY: 0,
    };

    try {
      const updatedOverrides = await overrideService.saveOverride(
        sceneId,
        h.id || h.label,
        resolvedOverride.ath,
        resolvedOverride.atv,
        resolvedOverride.screenOffsetX || 0,
        resolvedOverride.screenOffsetY || 0,
        patch
      );
      setOverrides(updatedOverrides);
      setToast({ message: "Saved successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: `Save failed: ${err.message}`, type: "error" });
    }
  }, [selectedHotspot, overrides, sceneId]);

  // Note 8: 수정한 핫스팟 오버라이드를 지우고 본래 데이터 기본 좌표로 리셋하는 콜백입니다.
  const handleReset = useCallback(async () => {
    if (!selectedHotspot) return;
    const h = selectedHotspot.hotspot;

    try {
      const updatedOverrides = await overrideService.resetOverride(sceneId, h.id || h.label);
      setOverrides(updatedOverrides);
      setToast({ message: "Reset successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: `Reset failed: ${err.message}`, type: "error" });
    }
  }, [selectedHotspot, sceneId]);

  // Note 9: 복제 가능한 클립보드에 위경도 좌표 문자열을 인코딩 복사하는 콜백입니다.
  const handleCopyPosition = useCallback(() => {
    if (!selectedHotspot) return;
    const h = selectedHotspot.hotspot;
    const sceneOverrides = overrides[sceneId] || {};
    const override = sceneOverrides[h.id || h.label];
    const ath = override?.ath ?? h.lon;
    const atv = override?.atv ?? h.lat;

    navigator.clipboard.writeText(JSON.stringify({ ath, atv }, null, 2));
    setToast({ message: "Position copied!", type: "success" });
  }, [selectedHotspot, overrides, sceneId]);

  // Note 10: 프로젝트 전체 핫스팟 오버라이드 데이터를 통째로 JSON 문자열 복사 내보내기합니다.
  const handleExportJSON = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(overrides, null, 2));
    setToast({ message: "All overrides exported & copied!", type: "success" });
  }, [overrides]);

  const handleCreateHotspot = useCallback(async (
    label: string,
    labelEn: string,
    kind: string,
    type: string,
    target: string,
    sub: string,
    ath: number,
    atv: number
  ) => {
    try {
      const result = await overrideService.addHotspot(sceneId, label, labelEn, kind, type, target, sub, ath, atv);
      setAddedHotspots(result.addedHotspots);
      setToast({ message: "Hotspot added successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: `Add failed: ${err.message}`, type: "error" });
    }
  }, [sceneId]);

  const handleDeleteHotspot = useCallback(async () => {
    if (!selectedHotspot) return;
    const h = selectedHotspot.hotspot;
    if (!h.id.startsWith("added-")) {
      setToast({ message: "Only custom dynamic hotspots can be deleted.", type: "error" });
      return;
    }
    try {
      const result = await overrideService.deleteHotspot(sceneId, h.id);
      setAddedHotspots(result.addedHotspots);
      setSelectedHotspot(null);
      setToast({ message: "Hotspot deleted successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: `Delete failed: ${err.message}`, type: "error" });
    }
  }, [selectedHotspot, sceneId]);

  return {
    interactionMode,
    setInteractionMode,
    overrides,
    setOverrides,
    addedHotspots,
    setAddedHotspots,
    selectedHotspot,
    setSelectedHotspot,
    toast,
    setToast,
    handleEditorKeyDown,
    startDrag,
    handleDrag,
    endDrag,
    handleSave,
    handleReset,
    handleCopyPosition,
    handleExportJSON,
    handleCreateHotspot,
    handleDeleteHotspot,
  };
}
