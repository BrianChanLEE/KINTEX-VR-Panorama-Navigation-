/**
 * MinimalXrScene.tsx
 * 
 * Vision Pro Safari WebXR 레이어 합성(Layer Composition) 및 투명도 진단 전용 스크립트.
 * 실시간 로그 HUD 및 [📋 Copy Logs] 버튼 탑재 버전.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function MinimalXrScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 로그 누적용 배열
    const accumulatedLogs: string[] = [];

    // ========================================
    // 0. 실시간 콘솔 HUD 생성 (화면에 로그 뿌리기)
    // ========================================
    const logHud = document.createElement("div");
    logHud.id = "minimal-xr-hud";
    logHud.style.cssText = `
      position: fixed; top: 10px; left: 10px; right: 10px; height: 180px;
      z-index: 100002; background: rgba(0,0,0,0.85); color: #0f0;
      font-family: monospace; font-size: 11px; padding: 10px;
      overflow-y: auto; border: 1px solid #ff00ff; border-radius: 6px;
      pointer-events: auto; line-height: 1.4;
    `;
    document.body.appendChild(logHud);

    // 로그 복사 버튼 추가
    const copyButton = document.createElement("button");
    copyButton.textContent = "📋 Copy Logs";
    copyButton.style.cssText = `
      position: absolute; top: 5px; right: 5px; z-index: 100003;
      padding: 6px 12px; font-size: 10px; font-weight: bold;
      background: #ff00ff; color: white; border: none; border-radius: 4px;
      cursor: pointer; pointer-events: auto; font-family: monospace;
    `;
    logHud.appendChild(copyButton);

    copyButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      const textToCopy = accumulatedLogs.join("\n");
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyButton.textContent = "✅ Copied!";
        setTimeout(() => { copyButton.textContent = "📋 Copy Logs"; }, 2000);
      } catch (err) {
        console.error("Clipboard copy failed. Manual selection fallback.", err);
        copyButton.textContent = "❌ Failed to Copy";
      }
    });

    // 로그 표시창 영역 컨테이너
    const logOutput = document.createElement("div");
    logOutput.style.cssText = `margin-top: 25px; height: 140px; overflow-y: auto;`;
    logHud.appendChild(logOutput);

    const logToHud = (type: string, ...args: any[]) => {
      const msg = args.map(arg => 
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      ).join(" ");
      
      const time = new Date().toLocaleTimeString();
      const rawLine = `[${time}] [${type.toUpperCase()}] ${msg}`;
      accumulatedLogs.push(rawLine);

      const line = document.createElement("div");
      line.style.borderBottom = "1px solid #222";
      line.style.padding = "2px 0";
      line.innerHTML = `[${time}] <span style="color: ${type === "error" ? "#f00" : type === "warn" ? "#ff0" : "#0f0"}">[${type.toUpperCase()}]</span> ${msg}`;
      
      logOutput.appendChild(line);
      logOutput.scrollTop = logOutput.scrollHeight;
    };

    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args) => { origLog.apply(console, args); logToHud("log", ...args); };
    console.warn = (...args) => { origWarn.apply(console, args); logToHud("warn", ...args); };
    console.error = (...args) => { origError.apply(console, args); logToHud("error", ...args); };

    console.log("[MinimalXR] Log HUD with copy button enabled.");

    // ========================================
    // 1. 수동 WebGL 컨텍스트 생성 (alpha 채널 강제 비활성화)
    // ========================================
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const contextAttributes = {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      xrCompatible: true,
    };

    const glContext = canvas.getContext("webgl2", contextAttributes) || 
                      canvas.getContext("webgl", contextAttributes);

    // Three.js WebGLRenderer에 수동 컨텍스트 위임
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: (glContext as WebGLRenderingContext) || undefined,
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0xff00ff, 1.0); // 마젠타 배경색 강제 지정
    renderer.setClearAlpha(1.0);
    renderer.autoClear = true;
    
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");

    // WebGL 컨텍스트 makeXRCompatible() 즉시 실행 강제
    const gl = renderer.getContext() as any;
    if (gl && gl.makeXRCompatible) {
      gl.makeXRCompatible().then(() => {
        console.log("[MinimalXR] Context elevated via makeXRCompatible. Status:", gl.getContextAttributes()?.xrCompatible);
      }).catch((err: any) => {
        console.error("[MinimalXR] Failed to elevate context compatibility:", err);
      });
    }

    // ========================================
    // 2. Scene 생성 (마젠타 배경)
    // ========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xff00ff);

    // ========================================
    // 3. Camera 생성
    // ========================================
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    camera.position.set(0, 1.6, 0);

    // ========================================
    // 4. 큐브 생성 (depthTest/depthWrite 비활성화, renderOrder=999)
    // ========================================
    const cube1Geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const cube1Mat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      depthTest: false, 
      depthWrite: false 
    });
    const cubeFront1m = new THREE.Mesh(cube1Geo, cube1Mat);
    cubeFront1m.renderOrder = 999;
    scene.add(cubeFront1m);

    const cube2Geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const cube2Mat = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      depthTest: false, 
      depthWrite: false 
    });
    const cubeFront2m = new THREE.Mesh(cube2Geo, cube2Mat);
    cubeFront2m.renderOrder = 999;
    scene.add(cubeFront2m);

    const cubeFront5m = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, depthWrite: false })
    );
    cubeFront5m.renderOrder = 999;
    scene.add(cubeFront5m);

    const grid = new THREE.GridHelper(10, 10, 0x00ff00, 0x555555);
    grid.position.set(0, 0, 0);
    scene.add(grid);

    // ========================================
    // 5. DOM 인터페이스
    // ========================================
    const uiContainer = document.createElement("div");
    uiContainer.style.cssText = `
      position: fixed; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 100000;
      font-family: monospace; color: #ff00ff; text-align: center;
      background: rgba(0, 0, 0, 0.7); pointer-events: none;
      padding-top: 180px;
    `;
    uiContainer.innerHTML = `
      <h1 style="font-size: 24px; text-shadow: 0 0 10px #f0f; margin: 10px 0;">
        WebXR Layer Diagnostic Mode (Hybrid Opaque)
      </h1>
    `;
    document.body.appendChild(uiContainer);

    const vrButton = document.createElement("button");
    vrButton.textContent = "🥽 Start Diagnostic WebXR";
    vrButton.style.cssText = `
      padding: 18px 36px; font-size: 20px; font-weight: bold;
      background: #ff00ff; color: white; border: none; border-radius: 8px;
      cursor: pointer; pointer-events: auto; margin-bottom: 20px;
    `;
    uiContainer.appendChild(vrButton);

    let activeSession: any = null;
    let activeRefSpace: any = null;
    let hybridTickCount = 0;

    vrButton.addEventListener("click", async () => {
      if (!navigator.xr) {
        console.error("[MinimalXR] navigator.xr object missing!");
        return;
      }

      try {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        
        console.log("[MinimalXR] Requesting immersive-vr session...");
        const session = await navigator.xr.requestSession("immersive-vr", {
          requiredFeatures: ["local"]
        });
        
        console.log("[MinimalXR] Session mode acquired:", (session as any).mode);

        // @ts-ignore
        const xrGlLayer = new XRWebGLLayer(session, gl);
        await session.updateRenderState({ baseLayer: xrGlLayer });
        console.log("[MinimalXR] updateRenderState({ baseLayer }) SUCCESS!");

        const refSpace = await session.requestReferenceSpace("local");
        console.log("[MinimalXR] requestReferenceSpace('local') SUCCESS!");

        activeSession = session;
        activeRefSpace = refSpace;

        renderer.setAnimationLoop(null);
        await renderer.xr.setSession(session);
        uiContainer.style.display = "none";
        logHud.style.background = "rgba(0,0,0,0.6)";

        console.log("[MinimalXR] Starting manual WebXR frame loop listener...");
        session.requestAnimationFrame(manualXrLoop);
      } catch (err) {
        console.error("[MinimalXR] requestSession / setup failed:", err);
      }
    });

    // ========================================
    // 6. 하이브리드 수동 렌더 루프
    // ========================================
    const tempCamPos = new THREE.Vector3();
    const tempCamDir = new THREE.Vector3();

    const manualXrLoop = (time: number, frame: any) => {
      if (!activeSession) return;
      activeSession.requestAnimationFrame(manualXrLoop);
      executeDraw();
    };

    const executeDraw = () => {
      renderer.clear(true, true, true);
      renderer.setClearColor(0xff00ff, 1.0);
      renderer.setClearAlpha(1.0);

      const xrCam = renderer.xr.getCamera();
      if (xrCam && xrCam.cameras.length > 0) {
        const mainXrCamera = xrCam.cameras[0];
        mainXrCamera.getWorldPosition(tempCamPos);
        mainXrCamera.getWorldDirection(tempCamDir);

        cubeFront1m.position.copy(tempCamPos.clone().add(tempCamDir.clone().multiplyScalar(1.0)));
        cubeFront1m.rotation.y += 0.01;

        cubeFront2m.position.copy(tempCamPos.clone().add(tempCamDir.clone().multiplyScalar(2.0)));
        cubeFront2m.rotation.y -= 0.01;

        cubeFront5m.position.copy(tempCamPos.clone().add(tempCamDir.clone().multiplyScalar(5.0)));
        cubeFront5m.rotation.x += 0.01;
      }

      hybridTickCount++;
      if (hybridTickCount % 60 === 0) {
        console.log("[MinimalXR] Hybrid Loop Tick:", {
          hybridTickCount,
          isPresenting: renderer.xr.isPresenting,
          glW: renderer.domElement.width,
          glH: renderer.domElement.height
        });
      }

      renderer.render(scene, camera);
    };

    // 2D 대체 루프 (비 XR 모드 및 XR Compositor 대기 강제 우회용 백그라운드 드로우)
    const render2D = () => {
      requestAnimationFrame(render2D);
      
      if (!activeSession) {
        cubeFront1m.position.set(0, 1.6, -1);
        cubeFront2m.position.set(0, 1.6, -2);
        cubeFront5m.position.set(0, 1.6, -5);
        renderer.render(scene, camera);
      } else {
        executeDraw();
      }
    };
    requestAnimationFrame(render2D);

    const onResize = () => {
      if (renderer.xr.isPresenting) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    };
    window.addEventListener("resize", onResize);

    // ========================================
    // 리소스 정리
    // ========================================
    cleanupRef.current = () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      activeSession = null;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      cube1Geo.dispose();
      cube1Mat.dispose();
      cube2Geo.dispose();
      cube2Mat.dispose();
      grid.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      uiContainer.remove();
      logHud.remove();
    };

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        zIndex: 99999,
      }}
    />
  );
}
