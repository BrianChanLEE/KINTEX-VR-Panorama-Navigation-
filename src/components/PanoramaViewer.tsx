import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { getScene } from "../data/scenes";
import type { Hotspot, Scene } from "../models/scene.model";
import { useEditorController } from "../controllers/editor.controller";
import { useHotspotController } from "../controllers/hotspot.controller";
import { usePanoramaTextureController } from "../controllers/panoramaTexture.controller";
import { useWebXrHotspotController } from "../controllers/webxr.controller";
import { panoramaProjection } from "../utils/panoramaProjection";
import PanoramaView from "../views/PanoramaView";
import { rebuildPanoramaHotspotSprites } from "../services/panoramaHotspotSprite.service";

// Note 1: 환경변수를 활용하여 현재 핫스팟 수정 에디터 모드인지 파악합니다.
const isHotspotEditMode = import.meta.env.VITE_HOTSPOT_EDIT_MODE === "true";

export interface ViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  lookAround: () => void;
  lookAtPosition: (ath: number, atv: number) => void;
  enterVR: () => void;
}

interface Props {
  scene: Scene;
  autoRotate: boolean;
  showHotspots: boolean;
  headingRef: React.MutableRefObject<number>;
  onNavigate: (id: string) => void;
  onInfo: (h: Hotspot) => void;
  onLoadingChange?: (loading: boolean) => void;
  lang: "KOR" | "ENG";
  activeTab?: string | null;
  highlightedHotspotId?: string | null;
  vrMode?: boolean;
  setVrMode?: (fn: (v: boolean) => boolean) => void;
  onXrActiveChange?: (active: boolean) => void;
  onVrHardwareUnavailable?: () => void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Note 2: PanoramaViewer 컴포넌트는 Controller 역할을 수행하며 Three.js 초기화, 렌더링 루프 스케줄링 및 에디터 상태 조율을 중개합니다.
const PanoramaViewer = forwardRef<ViewerHandle, Props>(function PanoramaViewer(
  { scene, autoRotate, showHotspots, headingRef, onNavigate, onInfo, onLoadingChange, lang, activeTab, highlightedHotspotId, vrMode, setVrMode, onXrActiveChange, onVrHardwareUnavailable },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hotspotLayerRef = useRef<HTMLDivElement>(null);
  const hotspotRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Three.js 인스턴스 참조들
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const meshRef = useRef<THREE.Mesh>();
  const safetyArrowsGroupRef = useRef<THREE.Group>();
  
  const testCubeRef = useRef<THREE.Mesh>();
  const testGridRef = useRef<THREE.GridHelper>();
  const testAxesRef = useRef<THREE.AxesHelper>();
  const frameCountRef = useRef(0);

  // React 리렌더링을 트리거하지 않고 requestAnimationFrame 루프 내에서 변수를 최신 상태로 유지하기 위한 상태 Ref들
  const lonRef = useRef(scene.startLon);
  const latRef = useRef(scene.startLat || 0);
  const fovRef = useRef(90);
  const autoRef = useRef(autoRotate);
  const draggingRef = useRef(false);
  const velRef = useRef({ x: 0, y: 0 });
  const spinTargetRef = useRef<number | null>(null);
  const sceneDataRef = useRef<Scene>(scene);
  const showHotspotsRef = useRef(showHotspots);

  const [fade, setFade] = useState(false);

  // Note 3: Editor Controller 훅을 호출하여 단축키, 포인터 드래그 좌표 투영, reset/save 비즈니스 로직 상태를 인출합니다.
  const editor = useEditorController(scene.id, cameraRef, hotspotLayerRef);
  // Note 4: Hotspot Controller 훅을 호출하여 현재 탭 상태(safety 여부)에 최적화된 핫스팟 목록 필터 동작을 수행합니다.
  const { filterHotspots } = useHotspotController();
  // Note 5: 파노라마 텍스처 캐시 정책은 전용 컨트롤러를 통해 서비스와 분리합니다.
  const { getTexture, warmCurrentSceneWindow, releaseColdTextures } = usePanoramaTextureController(scene.id);

  const overridesRef = useRef(editor.overrides);
  const addedHotspotsRef = useRef(editor.addedHotspots);
  useEffect(() => {
    overridesRef.current = editor.overrides;
  }, [editor.overrides]);
  useEffect(() => {
    addedHotspotsRef.current = editor.addedHotspots;
  }, [editor.addedHotspots]);

  // autoRotate 및 showHotspots 변수들을 Ref들에 동기화
  useEffect(() => {
    autoRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    showHotspotsRef.current = showHotspots;
  }, [showHotspots]);

  // Three.js 애니메이션 프레임 루프용 activeTab Ref 동기화
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // WebXR용 3D 핫스팟 그룹 생성
  const xrHotspotsGroupRef = useRef<THREE.Group>(new THREE.Group());
  // WebXR 관련 상태와 입력 처리는 별도 컨트롤러에서 관리합니다.

  // WebXR 3D 핫스팟 갱신 효과
  useEffect(() => {
    const currentAdded = editor.addedHotspots[scene.id] || [];
    const mergedHotspots = [...scene.hotspots, ...currentAdded];
    const filtered = filterHotspots(mergedHotspots, showHotspots, activeTab);

    console.log("[WebXR Hotspots] Rebuilding 3D sprites. Count:", filtered.length);

    return rebuildPanoramaHotspotSprites({
      sceneId: scene.id,
      lang,
      group: xrHotspotsGroupRef.current,
      renderer: rendererRef.current,
      hotspots: filtered,
      overrides: editor.overrides,
      showHotspots,
      activeTab,
    });
  }, [scene.id, lang, showHotspots, activeTab, editor.addedHotspots, editor.overrides, filterHotspots]);

  // WebGL 3D Evacuation Arrows dynamic updates
  useEffect(() => {
    const arrowsGroup = safetyArrowsGroupRef.current;
    if (!arrowsGroup) return;

    // Clear existing arrows
    while (arrowsGroup.children.length > 0) {
      const child = arrowsGroup.children[0];
      arrowsGroup.remove(child);
      if (child instanceof THREE.ArrowHelper) {
        child.line.geometry.dispose();
        (child.line.material as THREE.Material).dispose();
        child.cone.geometry.dispose();
        (child.cone.material as THREE.Material).dispose();
      }
    }

    if (activeTab !== "safety") return;

    // Find exit hotspots
    const currentAdded = editor.addedHotspots[scene.id] || [];
    const allHotspots = [...scene.hotspots, ...currentAdded];
    const exits = allHotspots.filter((h) => 
      h.url?.includes("marker-exit") || 
      h.label?.includes("비상구") || 
      h.labelEn?.includes("Exit")
    );

    // Create 3D arrows on the floor pointing to each exit door
    for (const exit of exits) {
      const phi = THREE.MathUtils.degToRad(90 - exit.lat);
      const theta = THREE.MathUtils.degToRad(exit.lon);

      // Unit direction pointing towards exit
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.cos(theta)
      ).normalize();

      // Point on floor: start near camera and go towards the exit direction projection on the floor plane
      const floorDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      
      // Draw 3 arrows along this ray on the floor to show flow direction
      for (let d = 5; d <= 25; d += 10) {
        const origin = floorDir.clone().multiplyScalar(d).setY(-12);
        const arrowLength = 5;
        const arrowHelper = new THREE.ArrowHelper(
          floorDir,
          origin,
          arrowLength,
          0x10b981, // Neon Green
          1.8,      // headLength
          1.2       // headWidth
        );
        arrowsGroup.add(arrowHelper);
      }
    }
  }, [activeTab, scene.id, editor.addedHotspots]);

  const interactionModeRef = useRef(editor.interactionMode);
  useEffect(() => {
    interactionModeRef.current = editor.interactionMode;
  }, [editor.interactionMode]);

  const openAddModalRef = useRef<(ath: number, atv: number) => void>();

  // 에디터 모드 전환기용 키다운 이벤트 리스너 등록 효과
  useEffect(() => {
    if (!isHotspotEditMode) return;
    window.addEventListener("keydown", editor.handleEditorKeyDown);
    return () => window.removeEventListener("keydown", editor.handleEditorKeyDown);
  }, [editor.handleEditorKeyDown]);

  const handleHotspotClick = useCallback((targetId: string, h: Hotspot) => {
    const text = lang === "KOR" ? h.label : h.labelEn || h.label;
    if (isHotspotEditMode && editor.interactionMode === "click") {
      const targetScene = getScene(targetId);
      const isSuccess = !!targetScene;
      console.log(
        `[Hotspot Test]\nCurrent Scene:\n${scene.id}\nClicked Hotspot:\n${text}\nTarget Scene:\n${targetId}\nNavigation:\n${
          isSuccess ? "SUCCESS" : "FAILED"
        }`
      );
      if (isSuccess) {
        onNavigate(targetId);
      }
    } else {
      onNavigate(targetId);
    }
  }, [editor.interactionMode, isHotspotEditMode, lang, onNavigate, scene.id]);

  const webxr = useWebXrHotspotController({
    rendererRef,
    sceneRef,
    cameraRef,
    meshRef,
    xrHotspotsGroupRef,
    sceneDataRef,
    onNavigateHotspot: handleHotspotClick,
    vrMode,
    setVrMode,
    onXrActiveChange,
    onVrHardwareUnavailable,
  });

  /* ---------------- Note 5: WebGL Three.js Renderer & Sphere Geometry 초기 설정 ---------------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 마운트 레이아웃 계산 지연으로 인한 1x1 백버퍼 왜곡을 완벽히 격퇴하기 위해 브라우저 실 해상도 적용
    const width = Math.max(mount.clientWidth, window.innerWidth);
    const height = Math.max(mount.clientHeight, window.innerHeight);

    // WebGL 컨텍스트를 직접 생성하여 xrCompatible 속성 강제 부여 및 alpha 투명도 채널 영구 격파
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

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

    // MinimalXrScene 검증 완료 패턴: Vision Pro Safari WebXR 호환 옵션
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

    // WebXR 임머시브 세션 활성 중 setSize 호출을 차단하는 가드
    const originalSetSize = renderer.setSize.bind(renderer);
    renderer.setSize = (w, h, updateStyle) => {
      if (renderer.xr.isPresenting) {
        return;
      }
      if (w <= 10 || h <= 10) {
        console.warn("[WebXR Guard] Blocked micro resize collapse:", w, "x", h);
        return;
      }
      originalSetSize(w, h, updateStyle);
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 4));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x0d151d, 1);
    renderer.setClearAlpha(1.0);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    rendererRef.current = renderer;

    console.log("[PanoVR] Renderer created", {
      threeRevision: THREE.REVISION,
      xrCompatible: (renderer.getContext() as any).getContextAttributes()?.xrCompatible,
      drawingBufferW: renderer.getContext().drawingBufferWidth,
      drawingBufferH: renderer.getContext().drawingBufferHeight,
    });

    const tscene = new THREE.Scene();
    tscene.background = new THREE.Color(0x0d151d);
    sceneRef.current = tscene;

    // WebXR 3D 핫스팟 그룹 등록
    tscene.add(xrHotspotsGroupRef.current);

    // WebXR 런타임 렌더러 진단용 무텍스처 테스트 메시 강제 배치
    const testBoxGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const testBoxMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const testCube = new THREE.Mesh(testBoxGeom, testBoxMat);
    testCube.name = "testCube";
    testCube.position.set(0, 0, -3); // 카메라 정면 -3m 위치 고정
    testCube.visible = false; // 기본 2D 뷰어 모드에서는 미노출
    tscene.add(testCube);
    testCubeRef.current = testCube;

    const testGrid = new THREE.GridHelper(10, 10, 0x00ff00, 0x444444);
    testGrid.name = "testGrid";
    testGrid.position.set(0, -1.5, 0); // 가상 지면 높이 배치
    testGrid.visible = false;
    tscene.add(testGrid);
    testGridRef.current = testGrid;

    const testAxes = new THREE.AxesHelper(3);
    testAxes.name = "testAxes";
    testAxes.position.set(0, 0, -3);
    testAxes.visible = false;
    tscene.add(testAxes);
    testAxesRef.current = testAxes;

    // near=0.01: MinimalXrScene에서 검증됨. near=1이면 XR에서 1m 이내 클립됨
    const camera = new THREE.PerspectiveCamera(fovRef.current, width / height, 0.01, 2000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const geometry = new THREE.SphereGeometry(500, 72, 48);
    geometry.scale(-1, 1, 1); // 내부에 카메라가 위치하도록 x축 반전
    const material = new THREE.MeshBasicMaterial({ color: 0x0d151d });
    const mesh = new THREE.Mesh(geometry, material);
    tscene.add(mesh);
    meshRef.current = mesh;

    const arrowsGroup = new THREE.Group();
    tscene.add(arrowsGroup);
    safetyArrowsGroupRef.current = arrowsGroup;

    // ---- 포인터/마우스 드래그 상호작용 이벤트 정의 ----
    const el = renderer.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastX = 0;
    let lastY = 0;
    let pinchStart = 0;
    let pinchFov = fovRef.current;

    let downX = 0;
    let downY = 0;

    const onDown = (e: PointerEvent) => {
      if (rendererRef.current?.xr.isPresenting) return; // WebXR 세션 중에는 터치 드래그 차단
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      draggingRef.current = true;
      spinTargetRef.current = null;
      lastX = e.clientX;
      lastY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      velRef.current = { x: 0, y: 0 };
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinchStart = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchFov = fovRef.current;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (rendererRef.current?.xr.isPresenting) return; // WebXR 세션 중에는 터치 드래그 차단
      if (isHotspotEditMode && editor.interactionMode === "drag" && selectedHotspotRef.current) return;
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchStart > 0) {
          fovRef.current = clamp(pinchFov * (pinchStart / dist), 32, 90);
          camera.fov = fovRef.current;
          camera.updateProjectionMatrix();
        }
        return;
      }
      if (!draggingRef.current) return;
      const factor = fovRef.current / 90;
      const dx = (e.clientX - lastX) * 0.11 * factor;
      const dy = (e.clientY - lastY) * 0.11 * factor;
      lonRef.current -= dx;
      latRef.current = clamp(latRef.current + dy, -85, 85);
      velRef.current = { x: dx, y: dy };
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onUp = (e: PointerEvent) => {
      if (rendererRef.current?.xr.isPresenting) return; // WebXR 세션 중에는 터치 조작 차단
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) draggingRef.current = false;

      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      if (dx < 6 && dy < 6 && isHotspotEditMode && interactionModeRef.current === "add") {
        const layer = hotspotLayerRef.current;
        const cameraInstance = cameraRef.current;
        if (layer && cameraInstance) {
          const coords = panoramaProjection.calculateSphericalCoordinates(
            e.clientX,
            e.clientY,
            layer,
            cameraInstance
          );
          openAddModalRef.current?.(coords.lon, coords.lat);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (rendererRef.current?.xr.isPresenting) return; // WebXR 세션 중에는 휠 스크롤 차단
      e.preventDefault();
      fovRef.current = clamp(fovRef.current + e.deltaY * 0.05, 32, 90);
      camera.fov = fovRef.current;
      camera.updateProjectionMatrix();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    // 리사이즈 이벤트 수신 핸들러
    const onResize = () => {
      // WebXR Presenting 중에는 렌더러 사이즈를 강제 변경 시 에러 경고를 뱉으므로 리턴 가드 처리
      if (rendererRef.current?.xr.isPresenting) return;
      const w = Math.max(mount.clientWidth, window.innerWidth);
      const h = Math.max(mount.clientHeight, window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current?.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ---------------- Note 6: requestAnimationFrame 애니메이션 루프 및 핫스팟 스크린 좌표 갱신 투사(Projection) ---------------- */
    const target = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const forward = new THREE.Vector3();
    let raf = 0;

    const animate = (_time?: number, frame?: XRFrame) => {
      const isPresenting = renderer.xr.isPresenting;

      // WebXR 세션 작동 중에는 카메라의 투영 행렬 및 잘림 한계를 안전값으로 강제하고
      // 위치를 (0,0,0)에 잠금하여 360 파노라마 구체 왜곡/잘림 현상을 원천 방지
      if (isPresenting && cameraRef.current) {
        cameraRef.current.position.set(0, 0, 0);
        cameraRef.current.near = 0.01;
        cameraRef.current.far = 2000;
        cameraRef.current.updateProjectionMatrix();
      }

      // WebXR 세션 중 60프레임마다 상세 파이프라인 진단 덤프 로그 출력
      if (isPresenting) {
        frameCountRef.current++;
        if (frameCountRef.current % 60 === 0) {
          try {
            const mesh = meshRef.current;
            const mat = mesh?.material as THREE.MeshBasicMaterial;
            const cube = tscene.getObjectByName("testCube");
            console.log("[WebXR Render 60F Audit]", {
              "renderer.xr.isPresenting": renderer.xr.isPresenting,
              "scene.children.length": tscene.children.length,
              "camera.position": camera.position,
              "camera.near": camera.near,
              "camera.far": camera.far,
              "testMesh.visible": cube?.visible,
              "panoramaSphere.visible": mesh?.visible,
              "texture.image 존재 여부": !!mat?.map?.image,
              "renderer.info.render.calls": renderer.info.render.calls,
              "renderer.info.memory.textures": renderer.info.memory.textures,
              "renderer.domElement.width": renderer.domElement.width,
              "renderer.domElement.height": renderer.domElement.height,
            });
          } catch (e) {
            console.error("WebXR Audit dump failed:", e);
          }
        }
      }

      // 3D Sprite 핫스팟들은 오직 실제 WebXR Immersive VR 세션 진입 시에만 보이게 처리하여
      // 평상시 2D 화면에서 HTML 마커와 WebGL 3D 마커가 이중 노출되는 것을 차단.
      if (xrHotspotsGroupRef.current) {
        xrHotspotsGroupRef.current.visible = isPresenting;
      }

      if (isPresenting && frame) {
        webxr.handleWebXrFrameInput(frame);
      }

      // 자동 회전 루프 처리
      if (!isPresenting && autoRef.current && !draggingRef.current && spinTargetRef.current === null) {
        lonRef.current += 0.045;
      }
      // 360도 자동 한 바퀴 둘러보기 회전 처리
      if (!isPresenting && spinTargetRef.current !== null) {
        const diff = spinTargetRef.current - lonRef.current;
        if (Math.abs(diff) < 0.4) {
          lonRef.current = spinTargetRef.current;
          spinTargetRef.current = null;
        } else {
          lonRef.current += diff * 0.045;
        }
      }
      // 관성 마우스 슬라이딩 감쇄 처리
      if (!isPresenting && !draggingRef.current && (Math.abs(velRef.current.x) > 0.001 || Math.abs(velRef.current.y) > 0.001)) {
        lonRef.current -= velRef.current.x;
        latRef.current = clamp(latRef.current + velRef.current.y, -85, 85);
        velRef.current.x *= 0.93;
        velRef.current.y *= 0.93;
      }

      const lon = lonRef.current;
      const lat = latRef.current;
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      target.set(
        -500 * Math.sin(phi) * Math.sin(theta),
        500 * Math.cos(phi),
        -500 * Math.sin(phi) * Math.cos(theta)
      );

      if (!isPresenting) {
        camera.lookAt(target);
        headingRef.current = ((lon % 360) + 360) % 360;
      }
      
      // Evacuation Arrows Flow animation
      if (safetyArrowsGroupRef.current && safetyArrowsGroupRef.current.children.length > 0) {
        const time = Date.now() * 0.007;
        safetyArrowsGroupRef.current.children.forEach((child, index) => {
          if (child instanceof THREE.ArrowHelper) {
            const pulse = 1 + Math.sin(time - index * 0.5) * 0.2;
            child.scale.set(pulse, pulse, pulse);
          }
        });
      }

      renderer.render(tscene, camera);

      // 핫스팟을 2D 뷰포트 스크린 영역에 2차원 매핑 투사 처리
      const layer = hotspotLayerRef.current;
      if (layer && !isPresenting) {
        const w = layer.clientWidth;
        const h = layer.clientHeight;
        camera.getWorldDirection(forward);
        const list = [
          ...sceneDataRef.current.hotspots,
          ...(addedHotspotsRef.current[sceneDataRef.current.id] || [])
        ];
        
        for (let i = 0; i < list.length; i++) {
          const node = hotspotRefs.current[i];
          if (!node) continue;
          const hp = list[i];
          
          const isSafetyHotspot =
            hp.url?.includes("marker-fire") ||
            hp.url?.includes("marker-cctv") ||
            hp.url?.includes("marker-aed") ||
            hp.url?.includes("marker-safety") ||
            hp.url?.includes("marker-exit");

          const shouldShowSafety = activeTabRef.current === "safety";
          const isDimHotspot = hp.url?.includes("dim-img");

          if (!showHotspotsRef.current || (isSafetyHotspot && !shouldShowSafety) || isDimHotspot) {
            node.style.opacity = "0";
            node.style.pointerEvents = "none";
            continue;
          }

          // Note 7: 오버라이드 실시간 좌표 또는 원본 데이터 좌표를 조회하여 투영 계산을 처리합니다.
          const sceneOverrides = overridesRef.current[sceneDataRef.current.id] || {};
          const override = sceneOverrides[hp.id || hp.label];
          const resolvedAth = override?.ath ?? hp.lon;
          const resolvedAtv = override?.atv ?? hp.lat;

          const hphi = THREE.MathUtils.degToRad(90 - resolvedAtv);
          const htheta = THREE.MathUtils.degToRad(resolvedAth);
          tmp.set(
            -480 * Math.sin(hphi) * Math.sin(htheta),
            480 * Math.cos(hphi),
            -480 * Math.sin(hphi) * Math.cos(htheta)
          );

          const dir = tmp.clone().normalize();
          const dot = dir.dot(forward);
          const projected = tmp.clone().project(camera);
          const sx = (projected.x * 0.5 + 0.5) * w;
          const sy = (-projected.y * 0.5 + 0.5) * h;

          if (dot > 0.0 && projected.z < 1) {
            node.style.opacity = "1";
            node.style.pointerEvents = "auto";
            node.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
          } else {
            node.style.opacity = "0";
            node.style.pointerEvents = "none";
          }
        }
      }
    };
    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      geometry.dispose();
      material.dispose();

      // WebGL 컨텍스트 자원 즉각 해제 (InvalidStateError 완전 격퇴)
      try {
        const gl = renderer.getContext();
        const extension = gl?.getExtension("WEBGL_lose_context");
        if (extension) {
          extension.loseContext();
          console.log("[WebGL Cleanup] loseContext() triggered successfully.");
        }
      } catch (e) {
        console.warn("[WebGL Cleanup] Failed to trigger loseContext:", e);
      }

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 드래그 좌표 이동 연산의 반응 속도를 위해 selectedHotspot 참조 값을 Ref 동기화 처리
  const selectedHotspotRef = useRef(editor.selectedHotspot);
  useEffect(() => {
    selectedHotspotRef.current = editor.selectedHotspot;
  }, [editor.selectedHotspot]);

  /* ---------------- Note 8: 씬 전환(Transition) 시 크로스페이드(Crossfade) 및 파노라마 텍스처 백그라운드 스왑 ---------------- */
  // biome-ignore lint/correctness/useExhaustiveDependencies: effect is intentionally keyed on scene.id only
  useEffect(() => {
    editor.setSelectedHotspot(null);
    sceneDataRef.current = scene;
    hotspotRefs.current = [];
    const mesh = meshRef.current;
    if (!mesh) return;

    let cancelled = false;
    setFade(true);
    onLoadingChange?.(true);

    // Note 6: 씬 윈도우를 먼저 예열해 두면 다음 전환에서 texture.map 교체만 수행할 수 있습니다.
    warmCurrentSceneWindow(scene.id);

    void (async () => {
      try {
        const texture = await getTexture(scene.img);
        if (cancelled) {
          return;
        }

        texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() || 1;

        const mat = mesh.material as THREE.MeshBasicMaterial;
        const previousTexture = mat.map;
        mat.map = texture;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        previousTexture?.dispose();

        // 씬 회전 기준점 리셋
        lonRef.current = scene.startLon;
        latRef.current = scene.startLat || 0;
        fovRef.current = 90;
        if (cameraRef.current) {
          cameraRef.current.fov = 90;
          cameraRef.current.updateProjectionMatrix();
        }

        // WebXR 모드에서는 카메라 앵글이 강제 고정이므로 메쉬와 핫스팟 그룹을 y축 회전시켜 기준 2D 정면과 각도 싱크를 맞춰줍니다.
        if (rendererRef.current?.xr.isPresenting) {
          const rotationAngle = THREE.MathUtils.degToRad(scene.startLon);
          mesh.rotation.y = rotationAngle;
          if (xrHotspotsGroupRef.current) {
            xrHotspotsGroupRef.current.rotation.y = rotationAngle;
          }
          console.log("[WebXR Orientation Sync] Applied scene.startLon rotation:", scene.startLon);
        } else {
          // 비 XR 2D 모드에서는 회전 오프셋 복구
          mesh.rotation.y = 0;
          if (xrHotspotsGroupRef.current) {
            xrHotspotsGroupRef.current.rotation.y = 0;
          }
        }

        setTimeout(() => {
          if (cancelled) return;
          releaseColdTextures(scene.id);
          setFade(false);
          onLoadingChange?.(false);
        }, 120);
      } catch (error) {
        console.error("[PanoramaViewer] panorama texture load failed", error);
        if (!cancelled) {
          setFade(false);
          onLoadingChange?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  /* ---------------- Zoom & ResetView 명령 하달용 useImperativeHandle 바인딩 ---------------- */
  useImperativeHandle(ref, () => ({
    zoomIn() {
      fovRef.current = clamp(fovRef.current - 8, 32, 90);
      if (cameraRef.current) {
        cameraRef.current.fov = fovRef.current;
        cameraRef.current.updateProjectionMatrix();
      }
    },
    zoomOut() {
      fovRef.current = clamp(fovRef.current + 8, 32, 90);
      if (cameraRef.current) {
        cameraRef.current.fov = fovRef.current;
        cameraRef.current.updateProjectionMatrix();
      }
    },
    resetView() {
      latRef.current = 0;
      fovRef.current = 90;
      spinTargetRef.current = null;
      velRef.current = { x: 0, y: 0 };
      lonRef.current = sceneDataRef.current.startLon;
      if (cameraRef.current) {
        cameraRef.current.fov = 90;
        cameraRef.current.updateProjectionMatrix();
      }
    },
    lookAround() {
      spinTargetRef.current = lonRef.current + 360;
    },
    lookAtPosition(ath: number, atv: number) {
      lonRef.current = ath;
      latRef.current = atv;
      spinTargetRef.current = null;
      velRef.current = { x: 0, y: 0 };
    },
    enterVR() {
      webxr.enterVR();
    },
  }));

  const [addModalState, setAddModalState] = useState<{ visible: boolean; ath: number; atv: number } | null>(null);
  useEffect(() => {
    openAddModalRef.current = (ath, atv) => {
      setAddModalState({ visible: true, ath, atv });
    };
  }, []);

  const currentAdded = editor.addedHotspots[scene.id] || [];
  const mergedScene = {
    ...scene,
    hotspots: [...scene.hotspots, ...currentAdded]
  };

  const filteredHotspots = filterHotspots(mergedScene.hotspots, showHotspots, activeTab);

  return (
    <PanoramaView
      scene={mergedScene}
      lang={lang}
      fade={fade}
      toast={editor.toast}
      overrides={editor.overrides}
      interactionMode={editor.interactionMode}
      selectedHotspot={editor.selectedHotspot}
      filteredHotspots={filteredHotspots}
      isHotspotEditMode={isHotspotEditMode}
      draggingRef={draggingRef}
      mountRef={mountRef}
      hotspotLayerRef={hotspotLayerRef}
      setHotspotNodeRef={(node, index) => {
        hotspotRefs.current[index] = node;
      }}
      onNavigate={handleHotspotClick}
      onInfo={onInfo}
      startDrag={editor.startDrag}
      handleDrag={editor.handleDrag}
      endDrag={editor.endDrag}
      handleSave={editor.handleSave}
      handleReset={editor.handleReset}
      handleCopyPosition={editor.handleCopyPosition}
      handleExportJSON={editor.handleExportJSON}
      setInteractionMode={editor.setInteractionMode}
      setToast={editor.setToast}
      highlightedHotspotId={highlightedHotspotId}
      vrMode={vrMode}
      addModalState={addModalState}
      setAddModalState={setAddModalState}
      handleCreateHotspot={editor.handleCreateHotspot}
      handleDeleteHotspot={editor.handleDeleteHotspot}
    />
  );
});

export default PanoramaViewer;
