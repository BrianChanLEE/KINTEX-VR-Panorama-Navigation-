import { useEffect, useState, useRef } from "react";
import { getLogs, clearLogs, subscribeLogs, webXrStatus, type LogEntry } from "../utils/debugLogger";

export default function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState({ ...webXrStatus });
  const [minimized, setMinimized] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 드래그 좌표 및 상태 관리
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return { x: window.innerWidth - 440, y: window.innerHeight - 600 };
    }
    return { x: 100, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panelStart = useRef({ x: 0, y: 0 });

  // 뷰포트 크기 변화에 대응하는 좌표 클램프 가드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setPosition((prev) => {
        const widthLimit = minimized ? 160 : 420;
        const heightLimit = minimized ? 50 : 580;
        const maxX = window.innerWidth - widthLimit - 16;
        const maxY = window.innerHeight - heightLimit - 16;
        return {
          x: Math.max(16, Math.min(maxX, prev.x)),
          y: Math.max(16, Math.min(maxY, prev.y)),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [minimized]);

  useEffect(() => {
    // 로그 구독 바인딩
    const unsubscribe = subscribeLogs(() => {
      setLogs([...getLogs()]);
      setStatus({ ...webXrStatus });
    });

    // WebXR 실시간 파라미터 매초 갱신
    const interval = setInterval(() => {
      setStatus({ ...webXrStatus });
    }, 1000);

    setLogs([...getLogs()]);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // 새로운 로그 추가 시 자동 스크롤 다운
  useEffect(() => {
    if (!minimized) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, minimized]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("로그 복사 완료!");
    }).catch((err) => {
      console.error("로그 복사 실패:", err);
    });
  };

  // 포인터 기반 드래그 이벤트 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panelStart.current = { x: position.x, y: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // 화면 경계선 바깥 이탈 방지 가드 적용
    const widthLimit = minimized ? 160 : 420;
    const heightLimit = minimized ? 50 : 580;
    const maxX = window.innerWidth - widthLimit - 10;
    const maxY = window.innerHeight - heightLimit - 10;

    setPosition({
      x: Math.max(10, Math.min(maxX, panelStart.current.x + dx)),
      y: Math.max(10, Math.min(maxY, panelStart.current.y + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const isSuccess =
    status.rendererXrIsPresenting === true &&
    status.sessionMode === "immersive-vr" &&
    status.isSecureContext === true &&
    status.isImmersiveVrSupported === "true";

  return (
    <div
      className="fixed z-[9999] flex flex-col rounded-2xl border border-zinc-700/50 bg-zinc-950/90 text-white shadow-2xl backdrop-blur-md transition-shadow duration-300"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: minimized ? "160px" : "420px",
        height: minimized ? "50px" : "580px",
        fontFamily: "monospace",
        fontSize: "13px",
        pointerEvents: "auto",
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 드래그가 가능한 헤더 영역 */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 select-none cursor-grab active:cursor-grabbing"
      >
        <span className="flex items-center gap-2 font-bold text-sm pointer-events-none">
          <span className={`h-2.5 w-2.5 rounded-full ${isSuccess ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          XR Debug
        </span>
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {!minimized && (
            <>
              <button
                onClick={clearLogs}
                className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-[10px] transition active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={handleCopy}
                className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-[10px] transition active:scale-95"
              >
                Copy
              </button>
            </>
          )}
          <button
            onClick={() => setMinimized(!minimized)}
            className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold transition active:scale-95"
          >
            {minimized ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col flex-1 overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
          {/* WebXR Runtime Status Panel */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-zinc-800/80 bg-zinc-950/60 p-3.5 text-[11px] text-zinc-300 select-none">
            <div>Secure Context: <span className={status.isSecureContext ? "text-emerald-400 font-bold" : "text-rose-500"}>{String(status.isSecureContext)}</span></div>
            <div>Protocol: <span className="text-zinc-400">{status.protocol}</span></div>
            <div>Navigator XR: <span className={status.hasNavigatorXr ? "text-emerald-400" : "text-rose-500"}>{String(status.hasNavigatorXr)}</span></div>
            <div>Immersive VR: <span className={status.isImmersiveVrSupported === "true" ? "text-emerald-400 font-bold" : "text-rose-500"}>{status.isImmersiveVrSupported}</span></div>
            <div>XR Enabled: <span className={status.rendererXrEnabled ? "text-emerald-400" : "text-zinc-500"}>{String(status.rendererXrEnabled)}</span></div>
            <div>XR Presenting: <span className={status.rendererXrIsPresenting ? "text-emerald-400 font-bold" : "text-rose-500"}>{String(status.rendererXrIsPresenting)}</span></div>
            <div>Session Mode: <span className={status.sessionMode === "immersive-vr" ? "text-emerald-400 font-bold" : "text-rose-500"}>{status.sessionMode}</span></div>
            <div>vrMode State: <span className={status.currentVrMode ? "text-emerald-400" : "text-zinc-500"}>{String(status.currentVrMode)}</span></div>
            <div>Camera Pos: <span className="text-sky-300">{status.cameraPosition}</span></div>
            <div>Sphere Mesh: <span className={status.sphereMeshExists ? "text-emerald-400" : "text-rose-500"}>{status.sphereMeshExists ? "YES" : "NO"}</span></div>
            <div>Sphere Side: <span className="text-purple-300">{status.sphereMaterialSide}</span></div>
            <div>Texture Res: <span className="text-amber-300">{status.textureWidthHeight}</span></div>
            <div>Ratio: <span className="text-amber-300">{status.imageRatio.toFixed(2)}</span></div>
            <div>Equirectangular: <span className={status.isEquirectangular ? "text-emerald-400" : "text-rose-500"}>{String(status.isEquirectangular)}</span></div>
            <div>Canvas Size: <span className="text-zinc-400">{status.canvasWidthHeight}</span></div>
            <div>DPR: <span className="text-zinc-400">{status.devicePixelRatio}</span></div>
          </div>

          {/* Logs Terminal */}
          <div className="flex-1 overflow-y-auto bg-black p-3.5 space-y-1.5 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-zinc-600 text-center py-8 italic select-none">No console logs recorded.</div>
            ) : (
              logs.map((log) => {
                const colorMap = {
                  log: "text-zinc-300",
                  info: "text-sky-400",
                  warn: "text-amber-400 font-medium",
                  error: "text-rose-400 font-bold",
                };
                return (
                  <div key={log.id} className="leading-relaxed break-all">
                    <span className="text-zinc-500 mr-2 text-[10px]">{log.timestamp}</span>
                    <span className={colorMap[log.type]}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
