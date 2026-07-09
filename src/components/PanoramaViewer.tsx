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
import { panoramaProjection } from "../utils/panoramaProjection";
import PanoramaView from "../views/PanoramaView";
import { updateWebXRStatus } from "../utils/debugLogger";

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
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const globalTextureLoader = new THREE.TextureLoader();
// 로컬 경로의 파일 불러오기 시 CORS anonymous 차단 현상 방지를 위해 crossOrigin 비활성
// const globalTextureLoader_crossOrigin = "anonymous";
// globalTextureLoader.setCrossOrigin(globalTextureLoader_crossOrigin);

// Note 2: PanoramaViewer 컴포넌트는 Controller 역할을 수행하며 Three.js 초기화, 렌더링 루프 스케줄링 및 에디터 상태 조율을 중개합니다.
const PanoramaViewer = forwardRef<ViewerHandle, Props>(function PanoramaViewer(
  { scene, autoRotate, showHotspots, headingRef, onNavigate, onInfo, onLoadingChange, lang, activeTab, highlightedHotspotId, vrMode, setVrMode, onXrActiveChange },
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
  const hotspotCtl = useHotspotController();

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

  // WebXR 세션 라이프사이클 처리 효과
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.xr.enabled = true;

    const onSessionStart = () => {
      setVrMode?.(() => true);
      onXrActiveChange?.(true);

      console.log("[WebXR] sessionstart");
      console.log("[WebXR] renderer.xr.isPresenting true");

      // Scene 그래프에서 직접 이름으로 조회하여 클로저 Ref 렉시컬 소실 예방
      const tscene = sceneRef.current;
      if (tscene) {
        const cube = tscene.getObjectByName("testCube");
        const grid = tscene.getObjectByName("testGrid");
        const axes = tscene.getObjectByName("testAxes");
        if (cube) cube.visible = true;
        if (grid) grid.visible = true;
        if (axes) axes.visible = true;

        // 최초 VR 기동 시의 메쉬 및 핫스팟 회전각 정렬 동기화
        const mesh = meshRef.current;
        if (mesh) {
          const rotationAngle = THREE.MathUtils.degToRad(sceneDataRef.current.startLon);
          mesh.rotation.y = rotationAngle;
          if (xrHotspotsGroupRef.current) {
            xrHotspotsGroupRef.current.rotation.y = rotationAngle;
          }
          console.log("[WebXR Session Start Sync] Aligned Y rotation to startLon:", sceneDataRef.current.startLon);
        }
      }

      // WebXR 스펙 검증 및 런타임 진단 로그 출력
      const session = renderer.xr.getSession();
      const mesh = meshRef.current;
      const mat = mesh?.material as THREE.MeshBasicMaterial;
      const img = mat?.map?.image;
      const width = img?.width || 0;
      const height = img?.height || 0;
      const ratio = height > 0 ? width / height : 0;

      updateWebXRStatus({
        rendererXrEnabled: renderer.xr.enabled,
        rendererXrIsPresenting: renderer.xr.isPresenting,
        sessionMode: (session as any)?.mode || "N/A",
        currentVrMode: true,
        currentIsPresenting: true,
        sphereMeshExists: !!mesh,
        sphereMaterialSide: mat ? (mat.side === THREE.BackSide ? "BackSide" : String(mat.side)) : "N/A",
        textureWidthHeight: `${width}x${height}`,
        imageRatio: ratio,
        isEquirectangular: Math.abs(ratio - 2) < 0.02,
      });

      console.log("[WebXR Runtime Audit Log]", {
        "renderer.xr.enabled": renderer.xr.enabled,
        "renderer.xr.isPresenting": renderer.xr.isPresenting,
        "session.mode": (session as any)?.mode || "N/A",
        "camera.position": cameraRef.current?.position,
        "camera.quaternion": cameraRef.current?.quaternion,
        "panorama mesh 존재 여부": !!mesh,
        "panorama material.side": mat?.side,
        "panorama texture image width/height": `${width}x${height}`,
        "image ratio": ratio,
        "isEquirectangular": ratio === 2,
        "current vrMode": true
      });
    };

    const onSessionEnd = () => {
      setVrMode?.(() => false);
      onXrActiveChange?.(false);
      
      console.log("[WebXR] sessionend");
      console.log("[WebXR] renderer.xr.isPresenting false");

      const tscene = sceneRef.current;
      if (tscene) {
        const cube = tscene.getObjectByName("testCube");
        const grid = tscene.getObjectByName("testGrid");
        const axes = tscene.getObjectByName("testAxes");
        if (cube) cube.visible = false;
        if (grid) grid.visible = false;
        if (axes) axes.visible = false;

        // WebXR 세션 종료 시 메쉬 및 핫스팟 회전 오프셋 원상복구
        const mesh = meshRef.current;
        if (mesh) {
          mesh.rotation.y = 0;
          if (xrHotspotsGroupRef.current) {
            xrHotspotsGroupRef.current.rotation.y = 0;
          }
        }
      }

      updateWebXRStatus({
        rendererXrIsPresenting: false,
        sessionMode: "N/A",
        currentVrMode: false,
        currentIsPresenting: false,
      });
    };

    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    // vrMode 상태가 꺼지면 실행 중인 WebXR 세션을 중단
    if (!vrMode) {
      if (renderer.xr.isPresenting) {
        renderer.xr.getSession()?.end();
      }
    }

    return () => {
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
    };
  }, [vrMode, setVrMode]);

  // WebXR 3D 핫스팟 갱신 효과
  useEffect(() => {
    const group = xrHotspotsGroupRef.current;
    if (!group) return;

    // 기존 3D 핫스팟 클리어
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Sprite;
      group.remove(child);
      child.geometry.dispose();
      if (child.material) {
        if (child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      }
    }

    const currentAdded = editor.addedHotspots[scene.id] || [];
    const allHotspots = [...scene.hotspots, ...currentAdded];
    const filtered = hotspotCtl.filterHotspots(allHotspots, showHotspotsRef.current, activeTabRef.current);

    console.log("[WebXR Hotspots] Rebuilding 3D sprites. Count:", filtered.length);

    filtered.forEach((hp) => {
      // 1. 소방/안전 탭 및 디멘션 핫스팟 가시성 필터링 (2D 뷰포트와 100% 동기화)
      const isSafetyHotspot =
        hp.url?.includes("marker-fire") ||
        hp.url?.includes("marker-cctv") ||
        hp.url?.includes("marker-aed") ||
        hp.url?.includes("marker-safety") ||
        hp.url?.includes("marker-exit");

      const shouldShowSafety = activeTab === "safety";
      const isDimHotspot = hp.url?.includes("dim-img");

      // 필터 조건 미충족 시 스프라이트 생성을 건너뜀
      if ((isSafetyHotspot && !shouldShowSafety) || isDimHotspot) {
        return;
      }

      // 2. 에디터 오버라이드 좌표 반영
      const sceneOverrides = editor.overrides[scene.id] || {};
      const override = sceneOverrides[hp.id || hp.label];
      const resolvedAth = override?.ath ?? hp.lon;
      const resolvedAtv = override?.atv ?? hp.lat;

      // 이미지 경로 매핑 안전 보장
      let rawPath = hp.url || "assets/images/marker01.png";
      const imgPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

      // 브라우저 네이티브 Image 객체 로딩
      const img = new Image();
      img.crossOrigin = ""; // CORS 사용 안함 명시
      let isFallback = false;
      
      const createHotspotSprite = (texture: THREE.CanvasTexture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        const hphi = THREE.MathUtils.degToRad(90 - resolvedAtv);
        const htheta = THREE.MathUtils.degToRad(resolvedAth);
        
        sprite.position.set(
          -300 * Math.sin(hphi) * Math.sin(htheta),
          300 * Math.cos(hphi),
          -300 * Math.sin(hphi) * Math.cos(htheta)
        );
        
        // 텍스트 길이에 맞춰 가로 비율 확보
        const ratio = imageWidthToHeightRatio(hp.label);
        sprite.scale.set(30 * ratio, 30, 1);
        
        sprite.userData = { hotspot: hp };
        sprite.renderOrder = 10;
        group.add(sprite);
      };

      const buildCombinedTexture = (imageElement: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const labelText = hp.label || "";
        ctx.font = "bold 24px sans-serif";
        const textWidth = ctx.measureText(labelText).width;
        
        const iconSize = 64;
        const canvasWidth = Math.max(iconSize, textWidth + 20);
        const canvasHeight = iconSize + 40;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 1. 중앙에 아이콘 이미지 그리기
        const iconX = (canvasWidth - iconSize) / 2;
        ctx.drawImage(imageElement, iconX, 0, iconSize, iconSize);

        // 2. 하단 명칭 그리기 (아웃라인 + 흰색 채우기)
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 4;
        ctx.strokeText(labelText, canvasWidth / 2, iconSize + 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, canvasWidth / 2, iconSize + 6);

        return new THREE.CanvasTexture(canvas);
      };

      // 404 에셋 유실 대비 긴급 자가치유 로컬 캔버스 생성기
      const buildFallbackTexture = (labelText: string) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.font = "bold 24px sans-serif";
        const textWidth = ctx.measureText(labelText).width;
        
        const iconSize = 64;
        const canvasWidth = Math.max(iconSize, textWidth + 24);
        const canvasHeight = iconSize + 40;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // [도형 그리기] 이미지 대신 고유 마커 링(Ring) 및 원형을 그림
        const cx = canvasWidth / 2;
        const cy = iconSize / 2;
        
        // 그림자 및 외부 외곽선
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();

        // 메인 원색 (파노라마 이동 마커는 핫핑크/오렌지 조합으로 이목 집중)
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#ff007f";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();

        // 내부 흰색 포인트 점
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // 하단 텍스트 이름표 렌더링
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 4;
        ctx.strokeText(labelText, cx, iconSize + 6);
        ctx.fillStyle = "#ffff00"; // 복구 텍스트는 밝은 노란색으로 강조
        ctx.fillText(labelText, cx, iconSize + 6);

        return new THREE.CanvasTexture(canvas);
      };

      img.onload = () => {
        const texture = buildCombinedTexture(img);
        if (texture) {
          createHotspotSprite(texture);
        }
      };

      img.onerror = () => {
        if (!isFallback) {
          isFallback = true;
          // 첫 404 실패 시 로컬 기본 마커(marker01.png)로 한 번 폴백 시도
          console.warn("[WebXR Hotspots] Asset 404 load error. Attempting local marker01:", imgPath);
          img.src = "/mice/upload/mice_vr/marker/marker01.png";
        } else {
          // 기본 마커마저 404 에러일 경우, 로컬 캔버스 긴급 자가치유 텍스처로 자동 전환
          console.error("[WebXR Hotspots] Double 404 failure. Activating dynamic fallback texture for:", hp.label);
          const texture = buildFallbackTexture(hp.label || "");
          if (texture) {
            createHotspotSprite(texture);
          }
        }
      };

      img.src = imgPath;
    });

    // 헬퍼: 텍스트 길이에 따라 스프라이트 스케일 비율 계산
    function imageWidthToHeightRatio(label: string) {
      const textLen = label ? label.length : 0;
      if (textLen > 6) return 1.8;
      if (textLen > 3) return 1.4;
      return 1.1;
    }
  }, [scene.id, activeTab, showHotspots, editor.addedHotspots, editor.overrides]);

  // WebXR 컨트롤러 및 레이캐스터 연동
  useEffect(() => {
    const renderer = rendererRef.current;
    const tscene = sceneRef.current;
    if (!renderer || !tscene) return;

    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const onSelectStart = (event: any) => {
      const controller = event.target;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const group = xrHotspotsGroupRef.current;
      if (group) {
        const intersects = raycaster.intersectObjects(group.children);
        if (intersects.length > 0) {
          const clickedSprite = intersects[0].object;
          const hotspot = clickedSprite.userData?.hotspot;
          if (hotspot && hotspot.target) {
            handleHotspotClick(hotspot.target, hotspot);
          }
        }
      }
    };

    // 활성화된 모든 컨트롤러 객체들에 리스너 등록
    const controllers: THREE.XRTargetRaySpace[] = [];
    
    // Three.js 가상 디바이스 매핑 범위(최대 4개) 전체 커버
    for (let i = 0; i < 4; i++) {
      const controller = renderer.xr.getController(i);
      controller.addEventListener("selectstart", onSelectStart);
      tscene.add(controller);
      controllers.push(controller);
    }

    return () => {
      controllers.forEach((controller) => {
        controller.removeEventListener("selectstart", onSelectStart);
        tscene.remove(controller);
      });
    };
  }, [lang]);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    const animate = () => {
      const isPresenting = renderer.xr.isPresenting;

      // WebXR 세션 작동 중에는 카메라의 투영 행렬 및 잘림 한계를 안전값으로 강제하고
      // 위치를 (0,0,0)에 잠금하여 360 파노라마 구체 왜곡/잘림 현상을 원천 방지
      if (isPresenting && cameraRef.current) {
        cameraRef.current.position.set(0, 0, 0);
        cameraRef.current.near = 0.01;
        cameraRef.current.far = 2000;
        cameraRef.current.updateProjectionMatrix();

        // 렉시컬 스코프 소실 예방을 위해 매 프레임 테스트용 헬퍼 visible 강제 보정 주입
        const cube = tscene.getObjectByName("testCube");
        const grid = tscene.getObjectByName("testGrid");
        const axes = tscene.getObjectByName("testAxes");
        if (cube) cube.visible = true;
        if (grid) grid.visible = true;
        if (axes) axes.visible = true;
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

      // WebXR 상태 갱신 유틸 기동 (약 15프레임마다 주기적 수집)
      if (Math.random() < 0.07) {
        const session = renderer.xr.getSession();
        const mesh = meshRef.current;
        const mat = mesh?.material as THREE.MeshBasicMaterial;
        const img = mat?.map?.image;
        const width = img?.width || 0;
        const height = img?.height || 0;
        const ratio = height > 0 ? width / height : 0;
        const el = renderer.domElement;

        updateWebXRStatus({
          rendererXrEnabled: renderer.xr.enabled,
          rendererXrIsPresenting: renderer.xr.isPresenting,
          sessionMode: (session as any)?.mode || "N/A",
          currentVrMode: vrMode,
          currentIsPresenting: isPresenting,
          cameraPosition: camera
            ? `${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`
            : "N/A",
          cameraQuaternion: camera
            ? `${camera.quaternion.x.toFixed(2)}, ${camera.quaternion.y.toFixed(2)}, ${camera.quaternion.z.toFixed(2)}, ${camera.quaternion.w.toFixed(2)}`
            : "N/A",
          sphereMeshExists: !!mesh,
          sphereMaterialSide: mat ? (mat.side === THREE.BackSide ? "BackSide" : String(mat.side)) : "N/A",
          textureWidthHeight: `${width}x${height}`,
          imageRatio: ratio,
          isEquirectangular: Math.abs(ratio - 2) < 0.02,
          canvasWidthHeight: el ? `${el.clientWidth}x${el.clientHeight}` : "0x0",
          devicePixelRatio: window.devicePixelRatio,
        });
      }

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

    const loader = globalTextureLoader;
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
    lookAtPosition(ath: number, atv: number) {
      lonRef.current = ath;
      latRef.current = atv;
      spinTargetRef.current = null;
      velRef.current = { x: 0, y: 0 };
    },
    enterVR() {
      const renderer = rendererRef.current;
      if (!renderer) return;

      console.log("[WebXR] navigator.xr exists:", typeof navigator !== "undefined" && "xr" in navigator);

      if (!renderer.xr.isPresenting && typeof navigator !== "undefined" && "xr" in navigator && navigator.xr) {
        // VR 진입 1단계: 캔버스 부모 요소 및 캔버스 스타일의 축소 현상을 방지하도록 화면 강제 가득 점유
        const mount = mountRef.current;
        if (mount) {
          mount.style.width = "100vw";
          mount.style.height = "100vh";
        }
        renderer.domElement.style.width = "100vw";
        renderer.domElement.style.height = "100vh";

        // VR 진입 2단계: WebXR 세션 런칭 직전, 실제 물리 백버퍼 해상도를 확실히 설정 (1x1 방어)
        const width = Math.max(mount?.clientWidth || 0, window.innerWidth, 1024);
        const height = Math.max(mount?.clientHeight || 0, window.innerHeight, 768);
        
        console.log("[WebXR] Pre-session scale validation:", {
          mountWidth: mount?.clientWidth,
          mountHeight: mount?.clientHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          allocatedWidth: width,
          allocatedHeight: height
        });

        // isPresenting은 아직 false이므로 프록시 가드를 정상 통과함
        renderer.setSize(width, height, false);

        console.log("[WebXR] requestSession start");

        // WebGL context를 XR 호환 모드로 강제 전환 (MinimalXrScene 검증 패턴)
        const glCtx = renderer.getContext() as any;
        const makeCompatible = glCtx.makeXRCompatible
          ? glCtx.makeXRCompatible()
          : Promise.resolve();

        makeCompatible.then(() => {
          console.log("[WebXR] makeXRCompatible done");
          return navigator.xr!.isSessionSupported("immersive-vr");
        }).then((supported: boolean) => {
            console.log("[WebXR] isSessionSupported immersive-vr result:", supported);
            if (supported && typeof navigator !== "undefined" && navigator.xr) {
              const sessionInit = { requiredFeatures: ["local"] };
              navigator.xr.requestSession("immersive-vr", sessionInit).then(async (session) => {
                console.log("[WebXR] requestSession success");

                // MinimalXrScene 검증 완료 패턴: XRWebGLLayer 수동 바인딩 강제
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
              }).catch((err: any) => {
                console.error("[WebXR] requestSession failed:", err);
                setVrMode?.(() => false);
                onXrActiveChange?.(false);
              });
            } else {
              console.warn("WebXR immersive-vr not supported.");
              setVrMode?.(() => false);
              onXrActiveChange?.(false);
            }
          })
          .catch((err: any) => {
            console.error("WebXR session check failed:", err);
            setVrMode?.(() => false);
            onXrActiveChange?.(false);
          });
      }
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

  const filteredHotspots = hotspotCtl.filterHotspots(mergedScene.hotspots, showHotspots, activeTab);

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
      addModalState={addModalState}
      setAddModalState={setAddModalState}
      handleCreateHotspot={editor.handleCreateHotspot}
      handleDeleteHotspot={editor.handleDeleteHotspot}
    />
  );
});

export default PanoramaViewer;
