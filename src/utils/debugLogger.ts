// 전역 디버그 콘솔 로그 및 WebXR 상태 통합 수집 유틸

export interface LogEntry {
  id: string;
  type: "log" | "warn" | "error" | "info";
  timestamp: string;
  message: string;
}

export interface WebXRStatus {
  isSecureContext: boolean;
  protocol: string;
  hasNavigatorXr: boolean;
  isImmersiveVrSupported: string; // "checking" | "true" | "false" | "N/A"
  rendererXrEnabled: boolean;
  rendererXrIsPresenting: boolean;
  sessionMode: string;
  currentVrMode: boolean;
  currentIsPresenting: boolean;
  cameraPosition: string;
  cameraQuaternion: string;
  sphereMeshExists: boolean;
  sphereMaterialSide: string;
  textureWidthHeight: string;
  imageRatio: number;
  isEquirectangular: boolean;
  canvasWidthHeight: string;
  devicePixelRatio: number;
}

// 글로벌 공유 큐 & 상태
let logEntries: LogEntry[] = [];
const maxLogs = 300;
const listeners = new Set<() => void>();

export const webXrStatus: WebXRStatus = {
  isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
  protocol: typeof location !== "undefined" ? location.protocol : "N/A",
  hasNavigatorXr: typeof navigator !== "undefined" && "xr" in navigator,
  isImmersiveVrSupported: "checking",
  rendererXrEnabled: false,
  rendererXrIsPresenting: false,
  sessionMode: "N/A",
  currentVrMode: false,
  currentIsPresenting: false,
  cameraPosition: "0, 0, 0",
  cameraQuaternion: "0, 0, 0, 1",
  sphereMeshExists: false,
  sphereMaterialSide: "N/A",
  textureWidthHeight: "0x0",
  imageRatio: 0,
  isEquirectangular: false,
  canvasWidthHeight: "0x0",
  devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
};

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// 1. console hook 초기화
export function initConsoleHook() {
  if (typeof window === "undefined" || (window as any).__console_hooked__) return;
  (window as any).__console_hooked__ = true;

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  const createHook = (type: LogEntry["type"]) => {
    return (...args: any[]) => {
      // 오리지널 콘솔 출력 호출
      originalConsole[type](...args);

      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
        .getMilliseconds()
        .toString()
        .padStart(3, "0")}`;

      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        timestamp,
        message,
      };

      logEntries.push(entry);
      if (logEntries.length > maxLogs) {
        logEntries.shift();
      }
      notify();
    };
  };

  console.log = createHook("log");
  console.warn = createHook("warn");
  console.error = createHook("error");
  console.info = createHook("info");

  // 초기 브라우저 보안 컨텍스트 확인
  if (typeof navigator !== "undefined" && "xr" in navigator && navigator.xr) {
    navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
      webXrStatus.isImmersiveVrSupported = supported ? "true" : "false";
      notify();
    }).catch(() => {
      webXrStatus.isImmersiveVrSupported = "false";
      notify();
    });
  } else {
    webXrStatus.isImmersiveVrSupported = "N/A";
  }
}

// 로그 구독 및 데이터 획득 API
export function getLogs() {
  return logEntries;
}

export function clearLogs() {
  logEntries = [];
  notify();
}

export function subscribeLogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 2. WebXR 상태 수집 및 강제 노출
export function updateWebXRStatus(updates: Partial<WebXRStatus>) {
  Object.assign(webXrStatus, updates);
  notify();
}
