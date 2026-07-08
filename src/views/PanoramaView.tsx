import { useState } from "react";
import type { Scene, Hotspot } from "../models/scene.model";
import type { InteractionMode, ToastModel } from "../models/editor.model";
import { IconArrowDown, IconPin } from "../components/icons";

// Note 1: KINTEX 커스텀 배지를 프리미엄 카드 형태로 출력할 때 사용하는 다국어 라벨 매퍼 함수입니다.
const getKintexLabel = (text: string) => {
  return text
    .replace("SIC2027 ", "")
    .replace("KINTEX1", "제1전시장")
    .replace("KINTEX2", "제2전시장");
};

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
  handleSave: () => void;
  handleReset: () => void;
  handleCopyPosition: () => void;
  handleExportJSON: () => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setToast: (toast: ToastModel | null) => void;
}

// Note 2: PanoramaView 컴포넌트는 WebGL 씬 컨테이너 및 핫스팟 레이어, 에디터 패널의 DOM 구조를 렌더하는 프레젠테이셔널 뷰입니다.
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
}: PanoramaViewProps) {
  return (
    <div className="absolute inset-0 select-none">
      {/* Three.js canvas mount container */}
      <div
        ref={mountRef}
        className={`absolute inset-0 ${draggingRef.current ? "cursor-grabbing" : "cursor-grab"}`}
      />

      {/* Hotspots overlay layer */}
      <div ref={hotspotLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {scene.hotspots.map((h, i) => {
          const sceneOverrides = overrides[scene.id] || {};
          const override = sceneOverrides[h.id || h.label];
          const resolvedHotspot = {
            ...h,
            lon: override?.ath ?? h.lon,
            lat: override?.atv ?? h.lat,
          };
          
          // Note 3: 필터링 목록에 없는 핫스팟은 DOM 렌더 타임에 가려지도록 분기합니다.
          const isRendered = filteredHotspots.some((fh) => fh.id === h.id);
          if (!isRendered) return null;

          return (
            <div
              key={h.id}
              ref={(node) => setHotspotNodeRef(node, i)}
              className={`absolute left-0 top-0 will-change-transform ${
                isHotspotEditMode
                  ? interactionMode === "drag"
                    ? "pointer-events-auto cursor-grab select-none"
                    : "pointer-events-auto cursor-pointer"
                  : ""
              }`}
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
              />
            </div>
          );
        })}
      </div>

      {/* Dev Editor Control Panel */}
      {isHotspotEditMode && (
        <div
          className="absolute left-4 top-4 z-50 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/85 p-4 text-xs text-white backdrop-blur-md shadow-2xl"
          style={{ width: 280, pointerEvents: "auto" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-emerald-400 tracking-wider uppercase">Hotspot Editor</span>
            <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] text-emerald-400">DEV</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-white/40 font-semibold uppercase text-[10px]">Interaction Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setInteractionMode("drag");
                  setToast({ message: "Mode: Drag Edit", type: "success" });
                }}
                className={`rounded py-1 px-2 text-center font-semibold transition active:scale-95 ${
                  interactionMode === "drag"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                Drag Edit (D)
              </button>
              <button
                onClick={() => {
                  setInteractionMode("click");
                  setToast({ message: "Mode: Click Test", type: "success" });
                }}
                className={`rounded py-1 px-2 text-center font-semibold transition active:scale-95 ${
                  interactionMode === "click"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                Click Test (C)
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
                <div>
                  <span className="text-white/40">Label:</span>{" "}
                  <span className="text-white/90 font-semibold">{selectedHotspot.hotspot.label}</span>
                </div>
                <div>
                  <span className="text-white/40">Kind:</span>{" "}
                  <span className="font-mono text-white/90">{selectedHotspot.hotspot.kind}</span>
                </div>
                <div>
                  <span className="text-white/40">Target:</span>{" "}
                  <span className="font-mono text-white/90">{selectedHotspot.hotspot.target || "none"}</span>
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
                    onClick={handleSave}
                    className={`rounded py-1.5 px-3 font-semibold text-white transition ${
                      interactionMode === "click"
                        ? "bg-emerald-600/30 text-white/30 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 active:scale-95"
                    }`}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded bg-rose-600 hover:bg-rose-500 py-1.5 px-3 font-semibold text-white transition active:scale-95"
                  >
                    Reset
                  </button>
                </div>

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
                {interactionMode === "drag" ? "Drag Edit" : "Click Test"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Drag</span>
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
    </div>
  );
}

interface HotspotElementProps {
  h: Hotspot;
  onNavigate: (targetId: string) => void;
  onInfo: (h: Hotspot) => void;
  lang: "KOR" | "ENG";
  disableClick?: boolean;
}

// Note 4: 핫스팟 타입(nav, poi, info)에 따라 개별 형상을 출력하는 뷰 요소입니다.
function HotspotElement({ h, onNavigate, onInfo, lang, disableClick }: HotspotElementProps) {
  if (h.url?.includes("dim-img")) {
    return null;
  }
  const text = lang === "KOR" ? h.label : h.labelEn || h.label;

  if (h.kind === "nav") {
    const imgUrl = h.url
      ? h.url.startsWith("http")
        ? h.url
        : `https://k-mice.visitkorea.or.kr${h.url}`
      : "https://k-mice.visitkorea.or.kr/mice/upload/mice_vr/marker/marker01.png";

    const isKintexPin =
      imgUrl.includes("KINTEX_Exhibition") ||
      imgUrl.includes("SIC2027 KINTEX_Exhibition") ||
      h.label?.includes("KINTEX");
    const width = isKintexPin ? 75 : 72;
    const height = isKintexPin ? 90 : 72;

    const [imgErr, setImgErr] = useState(false);

    return (
      <button
        type="button"
        onClick={() => !disableClick && h.target && onNavigate(h.target)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {isKintexPin ? (
          /* Custom Premium White Card style for KINTEX pins */
          <div
            className="animate-floaty"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#ffffff",
              color: "#1f1f1f",
              borderRadius: "20px",
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              border: "1px solid #e5e5e5",
              position: "relative",
              minWidth: "120px",
              zIndex: 999,
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                backgroundColor: "#c40012",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "10px",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              KINTEX
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg style={{ width: "12px", height: "14px" }} viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8.5 0C3.81 0 0 3.81 0 8.5C0 14.875 8.5 20 8.5 20S17 14.875 17 8.5C17 3.81 13.19 0 8.5 0ZM8.5 11.5C6.84 11.5 5.5 10.16 5.5 8.5S6.84 5.5 8.5 5.5S11.5 6.84 11.5 8.5S10.16 11.5 8.5 11.5Z"
                  fill="#c40012"
                />
              </svg>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1f1f1f", whiteSpace: "nowrap" }}>
                {getKintexLabel(text)}
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-8px",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid #ffffff",
              }}
            />
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={text}
            style={{
              width,
              height,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              transition: "transform 0.2s",
            }}
            onError={() => {
              setImgErr(true);
            }}
          />
        )}
        {!isKintexPin && (
          <span
            style={{
              whiteSpace: "nowrap",
              borderRadius: 12,
              background: "#0a1429",
              padding: "4px 10px",
              fontSize: 13,
              color: "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            {text}
          </span>
        )}
      </button>
    );
  }

  if (h.kind === "info") {
    return (
      <button
        type="button"
        onClick={() => !disableClick && onInfo(h)}
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
    const imgUrl = h.url
      ? h.url.startsWith("http")
        ? h.url
        : `https://k-mice.visitkorea.or.kr${h.url}`
      : "https://k-mice.visitkorea.or.kr/mice/upload/mice_vr/marker/marker01.png";

    return (
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => !disableClick && isClickable && h.target && onNavigate(h.target)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          background: "none",
          border: "none",
          padding: 0,
          cursor: isClickable ? "pointer" : "default",
          transition: "transform 0.2s",
        }}
      >
        <img
          src={imgUrl}
          alt={text}
          style={{ height: "auto", maxWidth: 120, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
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
