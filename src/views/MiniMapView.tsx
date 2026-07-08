import type { Scene } from "../models/scene.model";
import { IconCompass, IconZoomIn, IconZoomOut } from "../components/icons";

interface MiniMapViewProps {
  scene: Scene;
  coneRef: React.RefObject<HTMLDivElement>;
  ringRef: React.RefObject<HTMLDivElement>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const CARDINAL_DIRECTIONS = ["N", "E", "S", "W"] as const;

// Note 1: MiniMapView는 나침반 이미지 및 레이아웃 구성만을 책임지는 순수 리프 뷰 컴포넌트입니다.
export default function MiniMapView({
  scene,
  coneRef,
  ringRef,
  onZoomIn,
  onZoomOut,
  onReset,
}: MiniMapViewProps) {
  return (
    <div className="glass flex items-end gap-2 rounded-2xl p-2.5 shadow-2xl">
      {/* zoom column */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="zoom in"
        >
          <IconZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="zoom out"
        >
          <IconZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="reset view"
        >
          <IconCompass className="h-4 w-4" />
        </button>
      </div>

      {/* compass + label */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-[86px] w-[86px]">
          {/* outer static frame */}
          <div className="absolute inset-0 rounded-full border border-white/12 bg-black/30" />
          
          {/* rotating cardinal ring */}
          <div ref={ringRef} className="absolute inset-0 will-change-transform">
            {CARDINAL_DIRECTIONS.map((direction, index) => (
              <span
                key={direction}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 font-cond text-[10px] font-600 ${
                  direction === "N" ? "text-kx-bright" : "text-white/45"
                }`}
                style={{
                  transform: `rotate(${index * 90}deg) translateY(-36px) rotate(${-index * 90}deg)`,
                }}
              >
                {direction}
              </span>
            ))}
          </div>

          {/* view cone */}
          <div
            ref={coneRef}
            className="absolute left-1/2 top-1/2 h-[34px] w-0 origin-bottom will-change-transform"
          >
            <div
              className="mx-auto h-0 w-0"
              style={{
                borderLeft: "13px solid transparent",
                borderRight: "13px solid transparent",
                borderBottom: "34px solid rgba(43,155,255,0.45)",
              }}
            />
          </div>

          {/* center hub */}
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-kx-blue" />
        </div>
        
        <div className="text-center leading-tight">
          <div className="text-[11px] font-600 text-white">{scene.ko}</div>
          <div className="font-cond text-[9px] uppercase tracking-[0.2em] text-kx-slate">
            360° · No.{scene.index}
          </div>
        </div>
      </div>
    </div>
  );
}
