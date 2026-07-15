import { useEffect, useState } from "react";
import type { Scene, Hotspot } from "../models/scene.model";
import type { InteractionMode, ToastModel } from "../models/editor.model";
import { IconArrowDown, IconPin } from "../components/icons";
import { SCENES } from "../data/scenes";
import { getHotspotBadgeConfig, getHotspotBadgeDataUrl } from "../utils/hotspotBadge";
import type { HotspotOverride } from "../models/hotspot.model";
import { resolveAssetPath } from "../utils/assetPath";
import type { MapTourSelection } from "../models/service-menu.model";

interface PanoramaViewProps {
  scene: Scene;
  lang: "KOR" | "ENG";
  fade: boolean;
  toast: ToastModel | null;
  overrides: Record<string, any>;
  interactionMode: InteractionMode;
  selectedHotspot: { hotspot: Hotspot; index: number } | null;
  filteredHotspots: Hotspot[];
  isHotspotEditMode: boolean;
  draggingRef: React.MutableRefObject<boolean>;
  highlightedHotspotId?: string | null;
  vrMode?: boolean;
  
  // Refs
  mountRef: React.RefObject<HTMLDivElement>;
  hotspotLayerRef: React.RefObject<HTMLDivElement>;
  setHotspotNodeRef: (node: HTMLDivElement | null, index: number) => void;

  // Handlers
  onNavigate: (targetId: string, h: Hotspot) => void;
  onInfo: (h: Hotspot) => void;
  startDrag: (e: React.PointerEvent<HTMLDivElement>, h: Hotspot, index: number) => void;
  handleDrag: (e: React.PointerEvent<HTMLDivElement>, h: Hotspot, index: number) => void;
  endDrag: (e: React.PointerEvent<HTMLDivElement>, h: Hotspot, index: number) => void;
  handleSave: (patch?: Partial<HotspotOverride>) => void;
  handleReset: () => void;
  handleCopyPosition: () => void;
  handleExportJSON: () => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setToast: (toast: ToastModel | null) => void;
  
  addModalState: { visible: boolean; ath: number; atv: number } | null;
  setAddModalState: React.Dispatch<React.SetStateAction<{ visible: boolean; ath: number; atv: number } | null>>;
  handleCreateHotspot: (label: string, labelEn: string, kind: string, type: string, target: string, sub: string, ath: number, atv: number) => Promise<void>;
  handleDeleteHotspot: () => Promise<void>;
  mapTourSelection?: MapTourSelection;
}

// Note 2: PanoramaView 컴포넌트는 WebGL 씬 캔테이너 및 핫스팟 레이어, 에디터 패널의 DOM 구조를 렌더하는 프레젠테이셔널 뷰입니다.
export default function PanoramaView({
  scene,
  lang,
  fade,
  toast,
  overrides,
  interactionMode,
  selectedHotspot,
  filteredHotspots,
  isHotspotEditMode,
  draggingRef,
  mountRef,
  hotspotLayerRef,
  setHotspotNodeRef,
  onNavigate,
  onInfo,
  startDrag,
  handleDrag,
  endDrag,
  handleSave,
  handleReset,
  handleCopyPosition,
  handleExportJSON,
  setInteractionMode,
  setToast,
  addModalState,
  setAddModalState,
  handleCreateHotspot,
  handleDeleteHotspot,
  highlightedHotspotId,
  vrMode,
  mapTourSelection,
}: PanoramaViewProps) {
  const [formLabel, setFormLabel] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formKind, setFormKind] = useState("poi");
  const [formType, setFormType] = useState("toilet");
  const [formTarget, setFormTarget] = useState("");
  const [formSub, setFormSub] = useState("");
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editLabelEn, setEditLabelEn] = useState("");
  const [editKind, setEditKind] = useState("poi");
  const [editType, setEditType] = useState("custom");
  const [editTarget, setEditTarget] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editUrl, setEditUrl] = useState("/mice/upload/mice_vr/marker/nav.png");

  useEffect(() => {
    if (!selectedHotspot) return;
    const hotspot = selectedHotspot.hotspot;
    const sceneOverrides = overrides[scene.id] || {};
    const override = sceneOverrides[hotspot.id || hotspot.label];

    setEditLabel(override?.label ?? hotspot.label ?? "");
    setEditLabelEn(override?.labelEn ?? hotspot.labelEn ?? "");
    setEditKind(override?.kind ?? hotspot.kind ?? "poi");
    setEditType(override?.type ?? (hotspot as Hotspot & { type?: string }).type ?? "custom");
    setEditTarget(override?.target ?? hotspot.target ?? "");
    setEditSub(override?.sub ?? hotspot.sub ?? "");
    setEditUrl(override?.url ?? hotspot.url ?? "/mice/upload/mice_vr/marker/nav.png");
  }, [selectedHotspot, overrides, scene.id]);

  const markerOptions = [
    { label: "Default", value: "/mice/upload/mice_vr/marker/nav.png" },
    { label: "Camera", value: "/mice/upload/mice_vr/marker/camera.png" },
    { label: "Aerial", value: "/mice/upload/mice_vr/marker/aerial.png" },
    { label: "Viewpoint", value: "/mice/upload/mice_vr/marker/vewer.png" },
    { label: "Restroom", value: "/mice/upload/mice_vr/marker/Restroom.png" },
    { label: "Convenience", value: "/mice/upload/mice_vr/marker/Convenience.png" },
    { label: "Cafe", value: "/mice/upload/mice_vr/marker/cafe.png" },
    { label: "Elevator", value: "/mice/upload/mice_vr/marker/Elevator.png" },
    { label: "Info", value: "/mice/upload/mice_vr/marker/Info.png" },
    { label: "Safety Exit", value: "/mice/upload/mice_vr/marker/Exit.png" },
    { label: "CCTV", value: "/mice/upload/mice_vr/marker/marker-cctv.png" },
  ];

  return (
    <div className="absolute inset-0 select-none">
      {/* Three.js canvas mount container */}
      <div
        ref={mountRef}
        className={`absolute inset-0 ${draggingRef.current ? "cursor-grabbing" : "cursor-grab"}`}
      />

      {/* Hotspots overlay layer */}
      <div ref={hotspotLayerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {scene.hotspots.map((h, i) => {
          const sceneOverrides = overrides[scene.id] || {};
          const override = sceneOverrides[h.id || h.label];
          const resolvedHotspot = {
            ...h,
            lon: override?.ath ?? h.lon,
            lat: override?.atv ?? h.lat,
            label: override?.label ?? h.label,
            labelEn: override?.labelEn ?? h.labelEn,
            kind: override?.kind ?? h.kind,
            type: override?.type ?? (h as Hotspot & { type?: string }).type,
            target: override?.target ?? h.target,
            sub: override?.sub ?? h.sub,
            url: override?.url ?? h.url,
          };
          
          // Note 3: 필터링 목록에 없는 핫스팟은 DOM 렌더 타임에 가려지도록 분기합니다.
          const isRendered = filteredHotspots.some((fh) => fh.id === h.id);
          if (!isRendered) return null;

          const isNextStep = (() => {
            if (
              !mapTourSelection ||
              mapTourSelection.navigationMode !== "guiding" ||
              !mapTourSelection.navigationRoute ||
              mapTourSelection.navigationRoute.length <= 1
            ) {
              return false;
            }
            const currentStepIdx = mapTourSelection.navigationRoute.findIndex((step) =>
              step.id.includes(`-${scene.id}-`)
            );
            if (currentStepIdx === -1 || currentStepIdx >= mapTourSelection.navigationRoute.length - 1) {
              return false;
            }
            const nextStep = mapTourSelection.navigationRoute[currentStepIdx + 1];
            const nextSceneId = nextStep.id.split("-")[1];
            return resolvedHotspot.target === nextSceneId;
          })();

          return (
            <div
              key={`${scene.id}:${h.id}`}
              ref={(node) => setHotspotNodeRef(node, i)}
              className={`absolute left-0 top-0 will-change-transform ${
                isHotspotEditMode
                  ? interactionMode === "drag"
                    ? "pointer-events-auto cursor-grab select-none"
                    : "pointer-events-auto cursor-pointer"
                  : ""
              } ${h.id === highlightedHotspotId ? "highlighted-hotspot" : ""}`}
              style={{ opacity: 0 }}
              onPointerDown={isHotspotEditMode ? (e) => startDrag(e, h, i) : undefined}
              onPointerMove={isHotspotEditMode ? (e) => handleDrag(e, h, i) : undefined}
              onPointerUp={isHotspotEditMode ? (e) => endDrag(e, h, i) : undefined}
            >
              <HotspotElement
                h={resolvedHotspot}
                onNavigate={(targetId) => onNavigate(targetId, h)}
                onInfo={onInfo}
                lang={lang}
                disableClick={isHotspotEditMode && interactionMode === "drag"}
                isNextStep={isNextStep}
              />
            </div>
          );
        })}
      </div>

      {/* Dev Editor Control Panel */}
      {isHotspotEditMode && (
        <div
          className="absolute left-4 top-4 z-50 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/85 p-4 text-xs text-white backdrop-blur-md shadow-2xl"
          style={{ width: 360, pointerEvents: "auto" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-emerald-400 tracking-wider uppercase">Hotspot Editor</span>
            <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] text-emerald-400">DEV</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-white/40 font-semibold uppercase text-[10px]">Interaction Mode</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => {
                  setInteractionMode("drag");
                  setToast({ message: "Mode: Edit", type: "success" });
                }}
                className={`rounded py-1 px-1.5 text-center font-semibold text-[10px] transition active:scale-95 ${
                  interactionMode === "drag"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                Edit (D)
              </button>
              <button
                onClick={() => {
                  setInteractionMode("click");
                  setToast({ message: "Mode: Click Test", type: "success" });
                }}
                className={`rounded py-1 px-1.5 text-center font-semibold text-[10px] transition active:scale-95 ${
                  interactionMode === "click"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                Test (C)
              </button>
              <button
                onClick={() => {
                  setInteractionMode("add");
                  setToast({ message: "Mode: Add Hotspot. Click on panorama to place.", type: "success" });
                }}
                className={`rounded py-1 px-1.5 text-center font-semibold text-[10px] transition active:scale-95 ${
                  interactionMode === "add"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                Add (A)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
            <div>
              <span className="text-white/40">Scene:</span>{" "}
              <span className="font-mono text-white/90">{scene.id}</span>
            </div>
            {selectedHotspot ? (
              <>
                <div>
                  <span className="text-white/40">ID:</span>{" "}
                  <span className="font-mono text-white/90">{selectedHotspot.hotspot.id}</span>
                </div>
                <div className="mt-1 border-t border-white/5 pt-2 flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-white/40">Label (KOR)</span>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/40">Label (ENG)</span>
                    <input
                      type="text"
                      value={editLabelEn}
                      onChange={(e) => setEditLabelEn(e.target.value)}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-white/40">Kind</span>
                      <select
                        value={editKind}
                        onChange={(e) => setEditKind(e.target.value)}
                        className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white outline-none focus:border-emerald-500"
                      >
                        <option value="poi">poi</option>
                        <option value="nav">nav</option>
                        <option value="info">info</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-white/40">Type</span>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white outline-none focus:border-emerald-500"
                      >
                        <option value="custom">custom</option>
                        <option value="toilet">toilet</option>
                        <option value="convenience">convenience</option>
                        <option value="cafe">cafe</option>
                        <option value="elevator">elevator</option>
                        <option value="nursing">nursing</option>
                        <option value="locker">locker</option>
                        <option value="smoking">smoking</option>
                      </select>
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/40">Target</span>
                    <input
                      type="text"
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/40">Sub</span>
                    <input
                      type="text"
                      value={editSub}
                      onChange={(e) => setEditSub(e.target.value)}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/40">Marker</span>
                    <select
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white outline-none focus:border-emerald-500"
                    >
                      {markerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-1 border-t border-white/5 pt-1.5 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-white/40">ath (lon):</span>
                    <span className="font-mono text-emerald-400">
                      {(
                        overrides[scene.id]?.[selectedHotspot.hotspot.id || selectedHotspot.hotspot.label]?.ath ??
                        selectedHotspot.hotspot.lon
                      ).toFixed(2)}
                      °
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">atv (lat):</span>
                    <span className="font-mono text-emerald-400">
                      {(
                        overrides[scene.id]?.[selectedHotspot.hotspot.id || selectedHotspot.hotspot.label]?.atv ??
                        selectedHotspot.hotspot.lat
                      ).toFixed(2)}
                      °
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">screen x/y:</span>
                    <span className="font-mono text-white/60">
                      {overrides[scene.id]?.[selectedHotspot.hotspot.id || selectedHotspot.hotspot.label] ? (
                        `${Math.round(
                          overrides[scene.id][selectedHotspot.hotspot.id || selectedHotspot.hotspot.label]
                            .screenOffsetX
                        )}px, ${Math.round(
                          overrides[scene.id][selectedHotspot.hotspot.id || selectedHotspot.hotspot.label]
                            .screenOffsetY
                        )}px`
                      ) : (
                        "Default"
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={interactionMode === "click"}
                    onClick={() =>
                      handleSave({
                        label: editLabel,
                        labelEn: editLabelEn,
                        kind: editKind,
                        type: editType,
                        target: editTarget,
                        sub: editSub,
                        url: editUrl,
                      })
                    }
                    className={`rounded py-1.5 px-3 font-semibold text-white transition ${
                      interactionMode === "click"
                        ? "bg-emerald-600/30 text-white/30 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 active:scale-95"
                    }`}
                  >
                    Save Edit
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded bg-rose-600 hover:bg-rose-500 py-1.5 px-3 font-semibold text-white transition active:scale-95"
                  >
                    Reset
                  </button>
                </div>

                {selectedHotspot?.hotspot?.id?.startsWith("added-") && (
                  <button
                    onClick={handleDeleteHotspot}
                    className="mt-1.5 w-full rounded bg-red-600 hover:bg-red-500 py-1.5 px-3 font-semibold text-white text-center transition active:scale-95 animate-pulse"
                  >
                    Delete Custom Hotspot
                  </button>
                )}

                <button
                  onClick={handleCopyPosition}
                  className="mt-1.5 w-full rounded bg-white/10 hover:bg-white/15 py-1 px-3 text-center transition active:scale-95"
                >
                  Copy Current Position
                </button>
              </>
            ) : (
              <div className="text-white/40 text-center py-4 italic">Select a hotspot to edit</div>
            )}
          </div>

          <div className="mt-1 border-t border-white/10 pt-2 flex flex-col gap-1 text-[10px] text-white/60 font-sans">
            <div className="flex justify-between">
              <span>Mode</span>
              <span className="font-semibold text-emerald-400">
                {interactionMode === "drag" ? "Edit" : interactionMode === "click" ? "Click Test" : "Add Hotspot"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Edit</span>
              <span className={interactionMode === "drag" ? "text-emerald-400" : "text-rose-400"}>
                {interactionMode === "drag" ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Scene Navigation</span>
              <span className={interactionMode === "click" ? "text-emerald-400" : "text-rose-400"}>
                {interactionMode === "click" ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div className="mt-2 border-t border-white/10 pt-2 flex flex-col gap-1.5">
            <button
              onClick={handleExportJSON}
              className="w-full rounded border border-white/20 hover:bg-white/5 py-1.5 px-3 text-center transition active:scale-95"
            >
              Export JSON overrides
            </button>
            <div className="text-[9px] text-white/30 text-center">
              Drag hotspots to adjust. Override saves to disk.
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toast && (
        <div
          className={`absolute bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-semibold text-white shadow-lg transition-opacity duration-300 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Loading veil / crossfade */}
      {!vrMode && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#0d151d] transition-opacity duration-500 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin-slow rounded-full border-2 border-white/15 border-t-kx-bright" />
            <span className="font-cond text-xs uppercase tracking-[0.35em] text-white/50">Loading panorama</span>
          </div>
        </div>
      )}

      {/* Add Hotspot Modal */}
      {addModalState?.visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div 
            className="w-96 rounded-xl border border-white/10 bg-zinc-950 p-6 text-xs text-white shadow-2xl flex flex-col gap-4"
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-emerald-400">새 핫스팟 추가 (Add Hotspot)</span>
              <span className="font-mono text-[9px] text-white/40">
                ath: {addModalState.ath.toFixed(2)}°, atv: {addModalState.atv.toFixed(2)}°
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-white/50 font-semibold">핫스팟 이름 (KOR)</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="예: 화장실, 카페, Gate 1"
                  className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white/50 font-semibold">핫스팟 이름 (ENG)</label>
                <input
                  type="text"
                  value={formLabelEn}
                  onChange={(e) => setFormLabelEn(e.target.value)}
                  placeholder="예: Restroom, Cafe, Gate 1"
                  className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white/50 font-semibold">작동 종류 (Kind)</label>
                <select
                  value={formKind}
                  onChange={(e) => {
                    setFormKind(e.target.value);
                    if (e.target.value !== "nav") {
                      setFormTarget("");
                    }
                  }}
                  className="rounded border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                >
                  <option value="poi">시설/위치 표시 (POI)</option>
                  <option value="nav">다른 씬 이동 (Navigation)</option>
                  <option value="info">상세 정보 표시 (Info)</option>
                </select>
              </div>

              {formKind === "nav" && (
                <div className="flex flex-col gap-1 animate-fadeIn">
                  <label className="text-white/50 font-semibold">이동 대상 씬 (Target Scene)</label>
                  <select
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    className="rounded border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">-- 대상 씬 선택 --</option>
                    {SCENES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ko} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-white/50 font-semibold">아이콘 타입 프리셋</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="rounded border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                >
                  <option value="toilet">화장실 (Restroom)</option>
                  <option value="convenience">편의점 (Convenience Store)</option>
                  <option value="cafe">카페 (Cafe)</option>
                  <option value="elevator">엘리베이터 (Elevator)</option>
                  <option value="nursing">수유실 (Nursing Room)</option>
                  <option value="locker">물품보관함 (Locker)</option>
                  <option value="smoking">흡연실 (Smoking Area)</option>
                  <option value="info">안내/정보 (Info)</option>
                  <option value="custom">기본 마커 (Default)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white/50 font-semibold">상세 정보 (Description - 선택)</label>
                <input
                  type="text"
                  value={formSub}
                  onChange={(e) => setFormSub(e.target.value)}
                  placeholder="예: 1전시장 로비 우측"
                  className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddModalState(null);
                  setFormLabel("");
                  setFormLabelEn("");
                  setFormKind("poi");
                  setFormType("toilet");
                  setFormTarget("");
                  setFormSub("");
                }}
                className="rounded bg-white/10 hover:bg-white/15 py-2 text-center font-semibold text-white transition active:scale-95"
              >
                취소 (Cancel)
              </button>
              <button
                type="button"
                disabled={formSubmitLoading || !formLabel || (formKind === "nav" && !formTarget)}
                onClick={async () => {
                  setFormSubmitLoading(true);
                  try {
                    await handleCreateHotspot(
                      formLabel,
                      formLabelEn,
                      formKind,
                      formType,
                      formTarget,
                      formSub,
                      addModalState.ath,
                      addModalState.atv
                    );
                    setAddModalState(null);
                    setFormLabel("");
                    setFormLabelEn("");
                    setFormKind("poi");
                    setFormType("toilet");
                    setFormTarget("");
                    setFormSub("");
                  } finally {
                    setFormSubmitLoading(false);
                  }
                }}
                className={`rounded py-2 text-center font-semibold text-white transition ${
                  formSubmitLoading || !formLabel || (formKind === "nav" && !formTarget)
                    ? "bg-emerald-600/30 text-white/30 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 active:scale-95"
                }`}
              >
                추가 완료 (Save)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HotspotElementProps {
  h: Hotspot;
  onNavigate: (targetId: string) => void;
  onInfo: (h: Hotspot) => void;
  lang: "KOR" | "ENG";
  disableClick?: boolean;
  isNextStep?: boolean;
}

// Note 4: 핫스팟 타입(nav, poi, info)에 따라 개별 형상을 출력하는 뷰 요소입니다.
function HotspotElement({ h, onNavigate, onInfo, lang, disableClick, isNextStep }: HotspotElementProps) {
  if (h.url?.includes("dim-img")) {
    return null;
  }
  const text = lang === "KOR" ? h.label : h.labelEn || h.label;
  const hotspotType = (h as Hotspot & { type?: string }).type;
  const iconUrl = resolveAssetPath(h.url || "/mice/upload/mice_vr/marker/nav.png");

  if (hotspotType && ["toilet", "convenience", "cafe", "elevator", "nursing", "locker", "smoking"].includes(hotspotType)) {
    return (
      <button
        type="button"
        disabled={disableClick}
        onClick={() => !disableClick && h.target && onNavigate(h.target)}
        aria-label={text}
        title={text}
        data-hotspot-kind="poi"
        className="flex flex-col items-center gap-1 border-0 bg-transparent p-0 text-white transition-transform duration-300 hover:scale-105 select-none"
      >
        <img
          src={iconUrl}
          alt={text}
          width={72}
          height={72}
          style={{
            width: 72,
            height: 72,
            objectFit: "contain",
            imageRendering: "auto",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        />
        <span className="max-w-[14rem] rounded bg-black/40 px-2 py-0.5 text-[11px] text-white/95 backdrop-blur-sm">
          {text}
        </span>
      </button>
    );
  }

  if (h.kind === "nav") {
    const isExit = h.url?.includes("marker-exit") || h.label?.includes("비상구") || h.labelEn?.includes("Exit");

    return (
      <div className="relative flex items-center justify-center">
        {isExit && (
          <div className="absolute rounded-full border-4 border-emerald-400 bg-emerald-500/20 ping-ring" style={{ width: 80, height: 80, pointerEvents: "none" }} />
        )}
        {isNextStep && (
          <div className="absolute rounded-full border-4 border-emerald-400 bg-emerald-500/20 ping-ring" style={{ width: 88, height: 88, pointerEvents: "none" }} />
        )}
        <button
          type="button"
          onClick={() => !disableClick && h.target && onNavigate(h.target)}
          aria-label={text}
          title={text}
          data-hotspot-kind="navigation"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 10,
          }}
        >
          <img
            src={iconUrl}
            alt={text}
            width={72}
            height={72}
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              imageRendering: "auto",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              transition: "transform 0.2s",
            }}
          />
          <span className="max-w-[14rem] rounded bg-black/40 px-2 py-0.5 text-[11px] text-white/95 backdrop-blur-sm">
            {text}
          </span>
        </button>
      </div>
    );
  }

  if (h.kind === "info") {
    return (
      <button
        type="button"
        onClick={() => !disableClick && onInfo(h)}
        data-hotspot-kind="information"
        className="group flex items-center gap-2"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/10 font-cond text-sm italic text-white backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-white/25">
          i
        </span>
        <span className="whitespace-nowrap rounded bg-black/55 px-2 py-0.5 text-[11px] text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          {text}
        </span>
      </button>
    );
  }

  if (h.kind === "poi") {
    const isClickable = !!h.target;
    const badgeConfig = getHotspotBadgeConfig(h, lang);
    const badgeSrc = getHotspotBadgeDataUrl(badgeConfig);

    return (
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => !disableClick && isClickable && h.target && onNavigate(h.target)}
        aria-label={text}
        title={text}
        data-hotspot-kind="poi"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: 0,
          cursor: isClickable ? "pointer" : "default",
          transition: "transform 0.2s",
        }}
      >
        <img
          src={badgeSrc}
          alt={text}
          width={badgeConfig.width}
          height={badgeConfig.height}
          style={{
            width: badgeConfig.width,
            height: badgeConfig.height,
            objectFit: "contain",
            imageRendering: "auto",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        borderRadius: 20,
        background: "#0a1429",
        padding: "5px 12px",
        color: "#fff",
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>{text}</span>
      {h.sub && <span style={{ fontSize: 11, opacity: 0.6 }}>· {h.sub}</span>}
    </div>
  );
}
