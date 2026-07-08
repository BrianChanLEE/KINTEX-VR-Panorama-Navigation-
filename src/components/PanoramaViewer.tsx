import {
  forwardRef,
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
import PanoramaView from "../views/PanoramaView";

// Note 1: 환경변수를 활용하여 현재 핫스팟 수정 에디터 모드인지 파악합니다.
const isHotspotEditMode = import.meta.env.VITE_HOTSPOT_EDIT_MODE === "true";

export interface ViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  lookAround: () => void;
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
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Note 2: PanoramaViewer 컴포넌트는 Controller 역할을 수행하며 Three.js 초기화, 렌더링 루프 스케줄링 및 에디터 상태 조율을 중개합니다.
const PanoramaViewer = forwardRef<ViewerHandle, Props>(function PanoramaViewer(
  { scene, autoRotate, showHotspots, headingRef, onNavigate, onInfo, onLoadingChange, lang, activeTab },
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
  const hotspotCtl = useHotspotController();

  const overridesRef = useRef(editor.overrides);
  useEffect(() => {
    overridesRef.current = editor.overrides;
  }, [editor.overrides]);

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

  // 에디터 모드 전환기용 키다운 이벤트 리스너 등록 효과
  useEffect(() => {
    if (!isHotspotEditMode) return;
    window.addEventListener("keydown", editor.handleEditorKeyDown);
    return () => window.removeEventListener("keydown", editor.handleEditorKeyDown);
  }, [editor.handleEditorKeyDown]);

  const handleHotspotClick = (targetId: string, h: Hotspot) => {
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
  };

  /* ---------------- Note 5: WebGL Three.js Renderer & Sphere Geometry 초기 설정 ---------------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    rendererRef.current = renderer;

    const tscene = new THREE.Scene();
    sceneRef.current = tscene;

    const camera = new THREE.PerspectiveCamera(fovRef.current, width / height, 1, 1100);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const geometry = new THREE.SphereGeometry(500, 72, 48);
    geometry.scale(-1, 1, 1); // 내부에 카메라가 위치하도록 x축 반전
    const material = new THREE.MeshBasicMaterial({ color: 0x0d151d });
    const mesh = new THREE.Mesh(geometry, material);
    tscene.add(mesh);
    meshRef.current = mesh;

    // ---- 포인터/마우스 드래그 상호작용 이벤트 정의 ----
    const el = renderer.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastX = 0;
    let lastY = 0;
    let pinchStart = 0;
    let pinchFov = fovRef.current;

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      draggingRef.current = true;
      spinTargetRef.current = null;
      lastX = e.clientX;
      lastY = e.clientY;
      velRef.current = { x: 0, y: 0 };
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinchStart = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchFov = fovRef.current;
      }
    };

    const onMove = (e: PointerEvent) => {
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
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) draggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
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
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ---------------- Note 6: requestAnimationFrame 애니메이션 루프 및 핫스팟 스크린 좌표 갱신 투사(Projection) ---------------- */
    const target = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const forward = new THREE.Vector3();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);

      // 자동 회전 루프 처리
      if (autoRef.current && !draggingRef.current && spinTargetRef.current === null) {
        lonRef.current += 0.045;
      }
      // 360도 자동 한 바퀴 둘러보기 회전 처리
      if (spinTargetRef.current !== null) {
        const diff = spinTargetRef.current - lonRef.current;
        if (Math.abs(diff) < 0.4) {
          lonRef.current = spinTargetRef.current;
          spinTargetRef.current = null;
        } else {
          lonRef.current += diff * 0.045;
        }
      }
      // 관성 마우스 슬라이딩 감쇄 처리
      if (!draggingRef.current && (Math.abs(velRef.current.x) > 0.001 || Math.abs(velRef.current.y) > 0.001)) {
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
      camera.lookAt(target);

      headingRef.current = ((lon % 360) + 360) % 360;
      renderer.render(tscene, camera);

      // 핫스팟을 2D 뷰포트 스크린 영역에 2차원 매핑 투사 처리
      const layer = hotspotLayerRef.current;
      if (layer) {
        const w = layer.clientWidth;
        const h = layer.clientHeight;
        camera.getWorldDirection(forward);
        const list = sceneDataRef.current.hotspots;
        
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
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      geometry.dispose();
      material.dispose();
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

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const relativeImgPath = scene.img.startsWith("/") ? scene.img.substring(1) : scene.img;
    loader.load(
      relativeImgPath,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const old = mat.map;
        mat.map = texture;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        old?.dispose();

        // 씬 회전 기준점 리셋
        lonRef.current = scene.startLon;
        latRef.current = scene.startLat || 0;
        fovRef.current = 90;
        if (cameraRef.current) {
          cameraRef.current.fov = 90;
          cameraRef.current.updateProjectionMatrix();
        }

        setTimeout(() => {
          if (cancelled) return;
          setFade(false);
          onLoadingChange?.(false);
        }, 120);
      },
      undefined,
      () => {
        if (!cancelled) {
          setFade(false);
          onLoadingChange?.(false);
        }
      }
    );

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
  }));

  const filteredHotspots = hotspotCtl.filterHotspots(scene.hotspots, showHotspots, activeTab);

  return (
    <PanoramaView
      scene={scene}
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
    />
  );
});

export default PanoramaViewer;
