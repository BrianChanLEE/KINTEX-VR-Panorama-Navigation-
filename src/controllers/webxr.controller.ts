import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { Hotspot, Scene } from "../models/scene.model";
import { updateWebXRStatus } from "../utils/debugLogger";

interface WebXrControllerParams {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | undefined>;
  sceneRef: React.MutableRefObject<THREE.Scene | undefined>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | undefined>;
  meshRef: React.MutableRefObject<THREE.Mesh | undefined>;
  xrHotspotsGroupRef: React.MutableRefObject<THREE.Group>;
  sceneDataRef: React.MutableRefObject<Scene>;
  onNavigateHotspot: (targetId: string, hotspot: Hotspot) => void;
  vrMode?: boolean;
  setVrMode?: (fn: (value: boolean) => boolean) => void;
  onXrActiveChange?: (active: boolean) => void;
  onVrHardwareUnavailable?: () => void;
}

interface WebXrHotspotActivation {
  selectNearest: () => boolean;
  selectFromRay: (origin: THREE.Vector3, direction: THREE.Vector3) => boolean;
}

const XR_HOTSPOT_FALLBACK_MAX_ANGLE_RAD = THREE.MathUtils.degToRad(8);

export function useWebXrHotspotController({
  rendererRef,
  sceneRef,
  cameraRef,
  meshRef,
  xrHotspotsGroupRef,
  sceneDataRef,
  onNavigateHotspot,
  vrMode,
  setVrMode,
  onXrActiveChange,
  onVrHardwareUnavailable,
}: WebXrControllerParams) {
  const sessionCleanupRef = useRef<(() => void) | null>(null);
  const controllerCleanupRef = useRef<(() => void)[]>([]);
  const lastActivationAtRef = useRef(0);
  const activeTransientSourceKeyRef = useRef<string | null>(null);
  const lastInputEventSignatureRef = useRef<string | null>(null);

  const activateHotspotOnce = useCallback((activate: () => boolean, sourceLabel: string) => {
    const now = Date.now();
    if (now - lastActivationAtRef.current < 700) {
      return false;
    }

    const activated = activate();
    if (activated) {
      lastActivationAtRef.current = now;
      console.log("[WebXR Input] hotspot activation committed", { source: sourceLabel });
    }

    return activated;
  }, []);

  const getSourceKey = useCallback((source: XRInputSource | undefined) => {
    if (!source) return "unknown";
    const profiles = source.profiles?.length ? source.profiles.join(",") : "no-profiles";
    return `${source.targetRayMode || "unknown"}:${source.handedness || "unknown"}:${profiles}`;
  }, []);

  const logWebXrInputEvent = useCallback((origin: string, event: any) => {
    const source = event?.inputSource;
    console.log(`[WebXR Input] ${origin} event`, {
      timestamp: new Date().toISOString(),
      eventType: event?.type || "N/A",
      sourceKey: getSourceKey(source),
      targetRayMode: source?.targetRayMode || "N/A",
      handedness: source?.handedness || "none",
      hasFrame: !!event?.frame,
      inputSourceCount: event?.session?.inputSources?.length ?? "N/A",
    });
  }, [getSourceKey]);

  const tryActivateNearestHotspotFromRay = useCallback((
    origin: THREE.Vector3,
    direction: THREE.Vector3,
  ) => {
    const group = xrHotspotsGroupRef.current;
    if (!group?.visible || group.children.length === 0) {
      console.log("[WebXR Input] hotspot ray fallback skipped", {
        reason: !group?.visible ? "group-hidden" : "empty-group",
        sceneId: sceneDataRef.current.id,
      });
      return false;
    }

    const normalizedDirection = direction.clone().normalize();
    const worldPosition = new THREE.Vector3();
    const toHotspot = new THREE.Vector3();
    let closestAngle = Infinity;
    let closestDistance = 0;
    let closestHotspot: Hotspot | null = null;
    let closestTarget: string | null = null;

    for (const child of group.children) {
      const hotspot = child.userData?.hotspot as Hotspot | undefined;
      if (!hotspot?.target) continue;

      child.getWorldPosition(worldPosition);
      toHotspot.copy(worldPosition).sub(origin).normalize();
      const angle = normalizedDirection.angleTo(toHotspot);
      if (!Number.isFinite(angle)) continue;

      const distance = origin.distanceTo(worldPosition);
      if (angle < closestAngle) {
        closestAngle = angle;
        closestDistance = distance;
        closestHotspot = hotspot;
        closestTarget = hotspot.target;
      }
    }

    if (!closestHotspot || !closestTarget) {
      console.log("[WebXR Input] hotspot ray fallback missed", {
        reason: "no-navigation-hotspots",
        sceneId: sceneDataRef.current.id,
        spriteCount: group.children.length,
      });
      return false;
    }

    const angleDeg = THREE.MathUtils.radToDeg(closestAngle);
    if (closestAngle > XR_HOTSPOT_FALLBACK_MAX_ANGLE_RAD) {
      console.log("[WebXR Input] hotspot ray fallback missed", {
        reason: "nearest-out-of-range",
        sceneId: sceneDataRef.current.id,
        nearestHotspotId: closestHotspot.id,
        nearestTarget: closestTarget,
        nearestAngleDeg: Number(angleDeg.toFixed(2)),
        nearestDistance: Number(closestDistance.toFixed(2)),
        thresholdDeg: Number(THREE.MathUtils.radToDeg(XR_HOTSPOT_FALLBACK_MAX_ANGLE_RAD).toFixed(2)),
      });
      return false;
    }

    console.log("[WebXR Input] hotspot ray fallback hit", {
      sceneId: sceneDataRef.current.id,
      hotspotId: closestHotspot.id,
      target: closestTarget,
      angleDeg: Number(angleDeg.toFixed(2)),
      distance: Number(closestDistance.toFixed(2)),
    });
    onNavigateHotspot(closestTarget, closestHotspot);
    return true;
  }, [onNavigateHotspot, sceneDataRef, xrHotspotsGroupRef]);

  const tryActivateHotspotFromRay = useCallback((origin: THREE.Vector3, direction: THREE.Vector3) => {
    const renderer = rendererRef.current;
    const group = xrHotspotsGroupRef.current;
    const baseCamera = renderer?.xr.getCamera?.() || cameraRef.current;
    if (!renderer || !group || !baseCamera) return false;

    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(direction).normalize();
    raycaster.camera = baseCamera as THREE.Camera;

    const intersects = raycaster.intersectObjects(group.children, true);
    if (intersects.length === 0) {
      return tryActivateNearestHotspotFromRay(origin, direction);
    }

    const clickedSprite = intersects[0].object as THREE.Sprite;
    const hotspot = clickedSprite.userData?.hotspot as Hotspot | undefined;
    if (!hotspot?.target) {
      return tryActivateNearestHotspotFromRay(origin, direction);
    }

    onNavigateHotspot(hotspot.target, hotspot);
    return true;
  }, [
    cameraRef,
    onNavigateHotspot,
    rendererRef,
    tryActivateNearestHotspotFromRay,
    xrHotspotsGroupRef,
  ]);

  const handleSessionSelect = useCallback((event: any) => {
    const source = event?.inputSource;
    const sourceKey = getSourceKey(source);
    const targetRayMode = source?.targetRayMode || "N/A";
    const hand = source?.handedness || "none";
    const eventType = event?.type || "N/A";
    const timestamp = new Date().toISOString();
    const eventSignature = `${eventType}:${sourceKey}:${String(event?.timeStamp || "0")}`;

    if (lastInputEventSignatureRef.current === eventSignature) {
      return;
    }
    lastInputEventSignatureRef.current = eventSignature;

    logWebXrInputEvent("session", event);
    console.log("[WebXR Input] session select", {
      timestamp,
      sourceKey,
      targetRayMode,
      handedness: hand,
      eventType,
    });

    updateWebXRStatus({
      lastInputEvent: eventType,
      lastInputSourceKey: sourceKey,
      lastInputTargetRayMode: targetRayMode,
      lastInputTimestamp: timestamp,
    });

    if (event?.type === "selectstart") {
      activeTransientSourceKeyRef.current = sourceKey;
      return;
    }

    if (event?.type === "selectend") {
      if (activeTransientSourceKeyRef.current === sourceKey) {
        activeTransientSourceKeyRef.current = null;
      }
      return;
    }

    if (event?.type !== "select") return;
    if (activeTransientSourceKeyRef.current && activeTransientSourceKeyRef.current !== sourceKey) {
      return;
    }

    const renderer = rendererRef.current;
    const referenceSpace = renderer?.xr.getReferenceSpace();
    const frame = event?.frame as XRFrame | undefined;
    if (!renderer || !referenceSpace || !frame) return;

    const pose = frame.getPose(source.targetRaySpace, referenceSpace);
    if (!pose) return;

    const origin = new THREE.Vector3(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z,
    );
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w,
      ),
    ).normalize();

    activateHotspotOnce(() => tryActivateHotspotFromRay(origin, direction), "transient-select");
  }, [
    activateHotspotOnce,
    getSourceKey,
    logWebXrInputEvent,
    rendererRef,
    tryActivateHotspotFromRay,
  ]);

  const handleInputsourcesChange = useCallback((event: any) => {
    const added = Array.from(event?.added || []).map((source: any) => source?.targetRayMode || "unknown");
    const removed = Array.from(event?.removed || []).map((source: any) => source?.targetRayMode || "unknown");
    console.log("[WebXR Input] inputsourceschange", { added, removed });
    updateWebXRStatus({
      lastInputEvent: "inputsourceschange",
      lastInputSourceKey: [...added, ...removed].join(",") || "N/A",
      lastInputTargetRayMode: [...added, ...removed].join(",") || "N/A",
      lastInputTimestamp: new Date().toISOString(),
    });
  }, []);

  const setVrRenderQuality = useCallback((scaleFactor: number, foveation: number) => {
    const xr = rendererRef.current?.xr as any;
    if (!xr) return;
    if (typeof xr.setFramebufferScaleFactor === "function") {
      xr.setFramebufferScaleFactor(scaleFactor);
    }
    if (typeof xr.setFoveation === "function") {
      xr.setFoveation(foveation);
    }
  }, [rendererRef]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.xr.enabled = true;

    const onSessionStart = () => {
      setVrMode?.(() => true);
      onXrActiveChange?.(true);
      activeTransientSourceKeyRef.current = null;

      console.log("[WebXR] sessionstart");
      console.log("[WebXR] renderer.xr.isPresenting true");

      const scene = sceneRef.current;
      if (scene) {
        const cube = scene.getObjectByName("testCube");
        const grid = scene.getObjectByName("testGrid");
        const axes = scene.getObjectByName("testAxes");
        if (cube) cube.visible = false;
        if (grid) grid.visible = false;
        if (axes) axes.visible = false;
      }

      const mesh = meshRef.current;
      if (mesh) {
        const rotationAngle = THREE.MathUtils.degToRad(sceneDataRef.current.startLon);
        mesh.rotation.y = rotationAngle;
        xrHotspotsGroupRef.current.rotation.y = rotationAngle;
      }

      const session = renderer.xr.getSession();
      const material = meshRef.current?.material as THREE.MeshBasicMaterial | undefined;
      const image = material?.map?.image;
      const width = image?.width || 0;
      const height = image?.height || 0;
      const ratio = height > 0 ? width / height : 0;

      updateWebXRStatus({
        rendererXrEnabled: renderer.xr.enabled,
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sessionMode: (session as any)?.mode || "N/A",
        currentVrMode: true,
        currentIsPresenting: true,
        sphereMeshExists: !!meshRef.current,
        sphereMaterialSide: material ? (material.side === THREE.BackSide ? "BackSide" : String(material.side)) : "N/A",
        textureWidthHeight: `${width}x${height}`,
        imageRatio: ratio,
        isEquirectangular: Math.abs(ratio - 2) < 0.02,
        lastInputEvent: "sessionstart",
        lastInputSourceKey: "N/A",
        lastInputTargetRayMode: "N/A",
        lastInputTimestamp: new Date().toISOString(),
      });
      console.log("[WebXR Session State]", {
        event: "sessionstart",
        currentSceneState: sceneDataRef.current.id,
        pendingScene: "N/A",
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sceneChildrenCount: sceneRef.current?.children.length ?? 0,
        materialUuid: (meshRef.current?.material as THREE.Material | undefined)?.uuid ?? "N/A",
        textureUuid: ((meshRef.current?.material as THREE.MeshBasicMaterial | undefined)?.map as THREE.Texture | undefined)?.uuid ?? "N/A",
        rendererInfoTextures: renderer.info.memory.textures,
        rendererInfoRenderCalls: renderer.info.render.calls,
      });
    };

    const onSessionEnd = () => {
      setVrMode?.(() => false);
      onXrActiveChange?.(false);
      sessionCleanupRef.current?.();
      sessionCleanupRef.current = null;
      activeTransientSourceKeyRef.current = null;

      console.log("[WebXR] sessionend");
      console.log("[WebXR] renderer.xr.isPresenting false");

      const scene = sceneRef.current;
      if (scene) {
        const cube = scene.getObjectByName("testCube");
        const grid = scene.getObjectByName("testGrid");
        const axes = scene.getObjectByName("testAxes");
        if (cube) cube.visible = false;
        if (grid) grid.visible = false;
        if (axes) axes.visible = false;
      }

      const mesh = meshRef.current;
      if (mesh) {
        mesh.rotation.y = 0;
        xrHotspotsGroupRef.current.rotation.y = 0;
      }

      updateWebXRStatus({
        rendererXrIsPresenting: false,
        sessionMode: "N/A",
        currentVrMode: false,
        currentIsPresenting: false,
        lastInputEvent: "sessionend",
        lastInputSourceKey: "N/A",
        lastInputTargetRayMode: "N/A",
        lastInputTimestamp: new Date().toISOString(),
      });
      console.log("[WebXR Session State]", {
        event: "sessionend",
        currentSceneState: sceneDataRef.current.id,
        pendingScene: "N/A",
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sceneChildrenCount: sceneRef.current?.children.length ?? 0,
        materialUuid: (meshRef.current?.material as THREE.Material | undefined)?.uuid ?? "N/A",
        textureUuid: ((meshRef.current?.material as THREE.MeshBasicMaterial | undefined)?.map as THREE.Texture | undefined)?.uuid ?? "N/A",
        rendererInfoTextures: renderer.info.memory.textures,
        rendererInfoRenderCalls: renderer.info.render.calls,
      });
    };

    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    if (!vrMode && renderer.xr.isPresenting) {
      renderer.xr.getSession()?.end();
    }

    return () => {
      sessionCleanupRef.current?.();
      sessionCleanupRef.current = null;
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
    };
  }, [rendererRef, sceneRef, meshRef, sceneDataRef, setVrMode, onXrActiveChange, vrMode, xrHotspotsGroupRef]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;

    const bindSessionListeners = (session: XRSession) => {
      if (typeof session.addEventListener !== "function") {
        return;
      }

      try {
        session.addEventListener("selectstart", handleSessionSelect);
        session.addEventListener("select", handleSessionSelect);
        session.addEventListener("selectend", handleSessionSelect);
        session.addEventListener("inputsourceschange", handleInputsourcesChange);
        sessionCleanupRef.current = () => {
          try {
            session.removeEventListener("selectstart", handleSessionSelect);
            session.removeEventListener("select", handleSessionSelect);
            session.removeEventListener("selectend", handleSessionSelect);
            session.removeEventListener("inputsourceschange", handleInputsourcesChange);
          } catch (cleanupError) {
            console.warn("[WebXR Input] session listener cleanup failed", cleanupError);
          }
        };
      } catch (bindingError) {
        console.error("[WebXR Input] session listener binding failed", bindingError);
        sessionCleanupRef.current = null;
      }
    };

    const bindControllerListeners = (controller: THREE.Object3D, index: number) => {
      const inputController = controller as any;
      if (typeof inputController.addEventListener !== "function") {
        return;
      }

      try {
        const controllerHandler = (event: any) => {
          logWebXrInputEvent(`controller-${index}`, event);
          handleSessionSelect(event);
        };

        inputController.addEventListener("selectstart", controllerHandler);
        inputController.addEventListener("select", controllerHandler);
        inputController.addEventListener("selectend", controllerHandler);
        controllerCleanupRef.current.push(() => {
          try {
            inputController.removeEventListener("selectstart", controllerHandler);
            inputController.removeEventListener("select", controllerHandler);
            inputController.removeEventListener("selectend", controllerHandler);
          } catch (cleanupError) {
            console.warn("[WebXR Input] controller listener cleanup failed", cleanupError);
          }
        });
        console.log("[WebXR Input] controller listeners bound", {
          index,
          targetRayMode: inputController?.inputSource?.targetRayMode || "unknown",
        });
      } catch (bindingError) {
        console.error("[WebXR Input] controller listener binding failed", bindingError);
      }
    };

    const onSessionStartInputs = () => {
      const session = renderer.xr.getSession();
      if (!session) return;
      controllerCleanupRef.current.forEach((cleanup) => cleanup());
      controllerCleanupRef.current = [];
      bindSessionListeners(session);
      bindControllerListeners(renderer.xr.getController(0), 0);
      bindControllerListeners(renderer.xr.getController(1), 1);
      console.log("[WebXR Input] session inputs bound", {
        sessionMode: (session as any)?.mode || "N/A",
        inputSourceCount: session.inputSources?.length ?? 0,
      });
    };

    const onSessionEndInputs = () => {
      sessionCleanupRef.current?.();
      sessionCleanupRef.current = null;
      controllerCleanupRef.current.forEach((cleanup) => cleanup());
      controllerCleanupRef.current = [];
      activeTransientSourceKeyRef.current = null;
      lastInputEventSignatureRef.current = null;
    };

    if (renderer.xr.getSession()) {
      bindSessionListeners(renderer.xr.getSession() as XRSession);
    }

    const onWebGlContextLost = (event: Event) => {
      event.preventDefault?.();
      console.error("[WebGL Context]", {
        event: "webglcontextlost",
        currentSceneState: sceneDataRef.current.id,
        pendingScene: "N/A",
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sceneChildrenCount: sceneRef.current?.children.length ?? 0,
      });
    };
    const onWebGlContextRestored = () => {
      console.warn("[WebGL Context]", {
        event: "webglcontextrestored",
        currentSceneState: sceneDataRef.current.id,
        pendingScene: "N/A",
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sceneChildrenCount: sceneRef.current?.children.length ?? 0,
      });
    };
    const onVisibilityChange = () => {
      console.log("[WebXR Lifecycle]", {
        event: "visibilitychange",
        visibilityState: document.visibilityState,
        currentSceneState: sceneDataRef.current.id,
        rendererXrIsPresenting: renderer.xr.isPresenting,
      });
    };
    const onWindowError = (event: ErrorEvent) => {
      console.error("[WebXR Lifecycle]", {
        event: "error",
        message: event.message,
        currentSceneState: sceneDataRef.current.id,
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[WebXR Lifecycle]", {
        event: "unhandledrejection",
        reason: String(event.reason || "unknown"),
        currentSceneState: sceneDataRef.current.id,
      });
    };
    renderer.domElement.addEventListener("webglcontextlost", onWebGlContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onWebGlContextRestored);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    renderer.xr.addEventListener("sessionstart", onSessionStartInputs);
    renderer.xr.addEventListener("sessionend", onSessionEndInputs);

    return () => {
      sessionCleanupRef.current?.();
      sessionCleanupRef.current = null;
      controllerCleanupRef.current.forEach((cleanup) => cleanup());
      controllerCleanupRef.current = [];
      renderer.domElement.removeEventListener("webglcontextlost", onWebGlContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onWebGlContextRestored);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      renderer.xr.removeEventListener("sessionstart", onSessionStartInputs);
      renderer.xr.removeEventListener("sessionend", onSessionEndInputs);
    };
  }, [rendererRef, sceneRef, tryActivateHotspotFromRay]);

  const handleWebXrFrameInput = useCallback((_frame?: XRFrame) => {}, []);

  const enterVR = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    console.log("[WebXR] navigator.xr exists:", typeof navigator !== "undefined" && "xr" in navigator);

    if (renderer.xr.isPresenting || typeof navigator === "undefined" || !("xr" in navigator) || !navigator.xr) {
      onVrHardwareUnavailable?.();
      return;
    }

    console.log("[WebXR] requestSession start");

    (async () => {
      try {
        setVrRenderQuality(2.5, 0);

        const mount = renderer.domElement.parentElement;
        if (mount) {
          mount.style.width = "100vw";
          mount.style.height = "100vh";
        }
        renderer.domElement.style.width = "100vw";
        renderer.domElement.style.height = "100vh";

        const width = Math.max(mount?.clientWidth || 0, window.innerWidth, 1024);
        const height = Math.max(mount?.clientHeight || 0, window.innerHeight, 768);

        console.log("[WebXR] Pre-session scale validation:", {
          mountWidth: mount?.clientWidth,
          mountHeight: mount?.clientHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          allocatedWidth: width,
          allocatedHeight: height,
        });

        renderer.setSize(width, height, false);

        const session = await navigator.xr!.requestSession("immersive-vr", {
          requiredFeatures: ["local"],
          optionalFeatures: ["hand-tracking"],
        });
        console.log("[WebXR] requestSession success");
        try {
          session.addEventListener("selectstart", handleSessionSelect);
          session.addEventListener("select", handleSessionSelect);
          session.addEventListener("selectend", handleSessionSelect);
          session.addEventListener("inputsourceschange", handleInputsourcesChange);
          sessionCleanupRef.current = () => {
            try {
              session.removeEventListener("selectstart", handleSessionSelect);
              session.removeEventListener("select", handleSessionSelect);
              session.removeEventListener("selectend", handleSessionSelect);
              session.removeEventListener("inputsourceschange", handleInputsourcesChange);
            } catch (cleanupError) {
              console.warn("[WebXR Input] session listener cleanup failed", cleanupError);
            }
          };
          console.log("[WebXR Input] session listeners bound from requestSession", {
            sessionMode: (session as any)?.mode || "N/A",
            inputSourceCount: session.inputSources?.length ?? 0,
          });
        } catch (bindingError) {
          console.error("[WebXR Input] session listener binding failed from requestSession", bindingError);
        }

        try {
          const glCtx = renderer.getContext();
          // @ts-ignore
          const xrGlLayer = new XRWebGLLayer(session, glCtx);
          await session.updateRenderState({ baseLayer: xrGlLayer });
          console.log("[WebXR] session.updateRenderState SUCCESS!");
        } catch (layerErr) {
          console.error("[WebXR] Failed to bind custom XRWebGLLayer:", layerErr);
        }

        await renderer.xr.setSession(session);
        console.log("[WebXR] renderer.xr.setSession completed");
      } catch (error: any) {
        console.error("[WebXR] requestSession failed:", error);
        setVrRenderQuality(1, 1);
        setVrMode?.(() => false);
        onXrActiveChange?.(false);
        if (
          error?.name === "NotSupportedError" ||
          String(error?.message || "").includes("No XR hardware found")
        ) {
          onVrHardwareUnavailable?.();
        }
      }
    })();
  }, [onVrHardwareUnavailable, onXrActiveChange, rendererRef, setVrMode, setVrRenderQuality]);

  return {
    enterVR,
    handleWebXrFrameInput,
    setVrRenderQuality,
  };
}
