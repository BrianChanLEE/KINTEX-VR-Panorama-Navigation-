import type { Scene } from "../models/scene.model";
import { IconCompass, IconZoomIn, IconZoomOut } from "../components/icons";

interface MiniMapViewProps {
  scene: Scene;
  coneRef: React.RefObject<HTMLDivElement>;
  ringRef: React.RefObject<HTMLDivElement>;
  beaconRef: React.RefObject<HTMLDivElement>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const CARDINAL_DIRECTIONS = ["N", "E", "S", "W"] as const;

export default function MiniMapView({
  scene,
  coneRef,
  ringRef,
  beaconRef,
  onZoomIn,
  onZoomOut,
  onReset,
}: MiniMapViewProps) {
  return (
    <div className="glass flex items-end gap-2 rounded-2xl p-2.5 shadow-2xl">
      {/* zoom column */}
      <div className="flex flex-col gap-1.5" style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="zoom in"
        >
          <IconZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="zoom out"
        >
          <IconZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 text-kx-mist transition-colors hover:bg-white/10 hover:text-white"
          aria-label="reset view"
        >
          <IconCompass className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* compass + label */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-[86px] w-[86px]">
          {/* outer static frame */}
          <div className="absolute inset-0 rounded-full border border-white/12 bg-black/35 backdrop-blur-md" />
          
          {/* rotating cardinal ring */}
          <div ref={ringRef} className="absolute inset-0 will-change-transform">
            {CARDINAL_DIRECTIONS.map((direction, index) => (
              <span
                key={direction}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 font-cond text-[10px] font-semibold ${
                  direction === "N" ? "text-emerald-400" : "text-white/45"
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
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderBottom: "34px solid rgba(16, 185, 129, 0.45)", // 안전/녹색 테마 일치
              }}
            />
          </div>

          {/* Target Hotspot Beacon Indicator */}
          <div
            ref={beaconRef}
            className="absolute left-1/2 top-1/2 h-[80px] w-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden z-10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white shadow-[0_0_10px_#10b981] animate-ping" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white shadow-[0_0_10px_#10b981]" />
          </div>

          {/* center hub */}
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-emerald-500" />
        </div>
        
        <div className="text-center leading-tight">
          <div className="text-[10px] font-semibold text-white truncate max-w-[80px]">{scene.ko}</div>
          <div className="font-cond text-[8px] uppercase tracking-[0.2em] text-zinc-400">
            360° · {scene.index}
          </div>
        </div>
      </div>
    </div>
  );
}
