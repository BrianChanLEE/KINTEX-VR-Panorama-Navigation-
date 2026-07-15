import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { NavigationStep } from "../models/service-menu.model";
import { getSceneCoords, getZonesForExhibitionFloor } from "../utils/dijkstra";
import { SCENES } from "../data/scenes";

interface ThreeMapCanvasProps {
  currentSceneId: string;
  currentZoneId: string;
  route: NavigationStep[];
  navigationMode: "idle" | "preview" | "guiding";
  menuCollapsed: boolean;
  selectedExhibition: string;
  selectedFloor: string;
  onSelectDestination: (sceneId: string) => void;
}

export default function ThreeMapCanvas({
  currentSceneId,
  currentZoneId,
  route,
  navigationMode,
  menuCollapsed,
  selectedExhibition,
  selectedFloor,
  onSelectDestination,
}: ThreeMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js instances persistent references
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Scene meshes references
  const currentMarkerRef = useRef<THREE.Mesh | null>(null);
  const currentRingRef = useRef<THREE.Mesh | null>(null);
  const nodesGroupRef = useRef<THREE.Group>(new THREE.Group());
  
  const routeLineRef = useRef<THREE.Line | null>(null);
  const routeTubeRef = useRef<THREE.Mesh | null>(null);
  const destPinRef = useRef<THREE.Mesh | null>(null);
  const movingDotsRef = useRef<THREE.Mesh[]>([]);

  // 1. WebGL 및 Three.js 기본 씬 빌드 (컴포넌트 마운트 시 최초 1회 실행)
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 340;

    // Scene & Renderer 초기설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1e22");
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera & Controls 초기설정
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 75, 95);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // 바닥 하향 앵글 락
    controls.minDistance = 15;
    controls.maxDistance = 220;
    controlsRef.current = controls;

    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 100, 50);
    scene.add(dirLight);

    // 씬 노드들을 담을 그룹 생성 및 추가
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    // 전시장 바닥층(Floor Planes) 가이드 와이어프레임 렌더링
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const floorsConfig = [
      { name: "1층", y: 0, color: 0x2e353c, opacity: 0.15 },
      { name: "2층", y: 12, color: 0x3d4750, opacity: 0.1 },
      { name: "3층", y: 24, color: 0x4d5b68, opacity: 0.08 },
    ];

    floorsConfig.forEach((cfg) => {
      // 제1전시장 구역 바닥 박스
      const geometry1 = new THREE.BoxGeometry(110, 0.1, 70);
      const material1 = new THREE.MeshPhongMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        shininess: 10,
      });
      const mesh1 = new THREE.Mesh(geometry1, material1);
      mesh1.position.set(0, cfg.y, -10);
      floorGroup.add(mesh1);

      // 외곽 와이어프레임
      const edges1 = new THREE.EdgesGeometry(geometry1);
      const line1 = new THREE.LineSegments(edges1, new THREE.LineBasicMaterial({ color: 0x4f5d6c, transparent: true, opacity: 0.4 }));
      line1.position.copy(mesh1.position);
      floorGroup.add(line1);

      // 격자 무늬 가이드
      const grid = new THREE.GridHelper(110, 11, 0x4f5d6c, 0x35414d);
      grid.position.set(0, cfg.y + 0.05, -10);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.2;
      floorGroup.add(grid);
    });

    // 2. 현재 위치 마커 배치
    const currentCoords = getSceneCoords(currentSceneId, currentZoneId);
    const markerGeo = new THREE.SphereGeometry(2, 32, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // neon green
    const currentMarker = new THREE.Mesh(markerGeo, markerMat);
    currentMarker.position.set(currentCoords.x, currentCoords.y + 0.5, currentCoords.z);
    scene.add(currentMarker);
    currentMarkerRef.current = currentMarker;

    // 맥동 링 효과
    const ringGeo = new THREE.RingGeometry(1.5, 3, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(currentMarker.position);
    scene.add(ringMesh);
    currentRingRef.current = ringMesh;

    // 카메라 대상을 현재 위치 마커로 최초 정렬
    controls.target.copy(currentMarker.position);
    camera.position.set(currentCoords.x, currentCoords.y + 60, currentCoords.z + 80);
    controls.update();

    // 3. Raycaster 상호작용 등록 (마운트 시 단 1회 등록하여 씬 전체 재배치에도 유지)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(nodesGroupRef.current.children);

      if (intersects.length > 0) {
        const clickedNode = intersects[0].object;
        const targetSceneId = clickedNode.name;
        if (targetSceneId) {
          onSelectDestination(targetSceneId);
        }
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(nodesGroupRef.current.children);

      if (intersects.length > 0) {
        renderer.domElement.style.cursor = "pointer";
      } else {
        renderer.domElement.style.cursor = "default";
      }
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("mousemove", onMouseMove);

    // 4. 창 리사이즈 핸들러
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      // WebGL 리소스 정리
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      });

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 2. 렌더 루프 및 애니메이션 제어 (menuCollapsed 상태에 맞춰 프레임 속도 일시정지/재개)
  useEffect(() => {
    if (menuCollapsed) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      if (!scene || !renderer || !camera || !controls) return;

      const elapsedTime = clockRef.current.getElapsedTime();

      // 현재 마커 위아래 동동 + 맥동 효과
      if (currentMarkerRef.current) {
        const coords = getSceneCoords(currentSceneId, currentZoneId);
        currentMarkerRef.current.position.y = coords.y + 0.5 + Math.sin(elapsedTime * 4) * 0.4;
      }
      if (currentRingRef.current) {
        const scale = 1 + (elapsedTime % 1.5) * 1.5;
        currentRingRef.current.scale.set(scale, scale, scale);
        (currentRingRef.current.material as THREE.Material).opacity = 1 - (elapsedTime % 1.5) / 1.5;
      }

      // 무빙 닷(Moving Dots) 곡선 흐름 애니메이션
      movingDotsRef.current.forEach((dot, idx) => {
        const speed = 0.5;
        const progress = (elapsedTime * speed + idx * 0.25) % 1.0;

        if (route.length > 1) {
          const totalSegments = route.length - 1;
          const segmentFloat = progress * totalSegments;
          const segmentIdx = Math.floor(segmentFloat);
          const segmentProgress = segmentFloat - segmentIdx;

          if (segmentIdx < totalSegments) {
            const startNode = route[segmentIdx].position;
            const endNode = route[segmentIdx + 1].position;

            dot.position.x = startNode.x + (endNode.x - startNode.x) * segmentProgress;
            dot.position.y = startNode.y + (endNode.y - startNode.y) * segmentProgress + 0.3;
            dot.position.z = startNode.z + (endNode.z - startNode.z) * segmentProgress;
          }
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    clockRef.current.start();
    animate();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [menuCollapsed, route, currentSceneId, currentZoneId]);

  // 3. 현재 위치 갱신 & 가이드 모드 진입 시 카메라 오토 스냅 (드래그 중에는 침범하지 않음)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || menuCollapsed || !currentMarkerRef.current || !currentRingRef.current) return;

    const currentCoords = getSceneCoords(currentSceneId, currentZoneId);
    
    // 마커 위치 업데이트
    currentMarkerRef.current.position.set(currentCoords.x, currentCoords.y + 0.5, currentCoords.z);
    currentRingRef.current.position.copy(currentMarkerRef.current.position);

    // 경로 안내 시작(guiding) 진입할 때만 카메라 초점을 강제 정렬 (이동 중 드래그 침범 억제)
    if (navigationMode === "guiding" && cameraRef.current && controlsRef.current) {
      controlsRef.current.target.copy(currentMarkerRef.current.position);
      cameraRef.current.position.set(currentCoords.x, currentCoords.y + 35, currentCoords.z + 45);
      controlsRef.current.update();
    }
  }, [currentSceneId, currentZoneId, menuCollapsed, navigationMode]);

  // 4. 선택한 층의 씬 목록(구체 노드) 실시간 업데이트
  useEffect(() => {
    const scene = sceneRef.current;
    const nodesGroup = nodesGroupRef.current;
    if (!scene || !nodesGroup || menuCollapsed) return;

    // 기존 3D 씬 노드들 제거 및 청소
    while (nodesGroup.children.length > 0) {
      const child = nodesGroup.children[0];
      nodesGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const zones = getZonesForExhibitionFloor(selectedExhibition, selectedFloor);
    const floorScenes = SCENES.filter((s) => {
      const isInZone = zones.includes(s.zone);
      const hasNav = s.hotspots && s.hotspots.some((h) => h.kind === "nav" && h.target);
      return isInZone && hasNav;
    });

    const nodeGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const nodeMatIdle = new THREE.MeshPhongMaterial({
      color: 0x3b82f6, // blue
      emissive: 0x0f172a,
      shininess: 30,
    });

    floorScenes.forEach((fsScene) => {
      // 현재 씬 위치에는 마커가 이미 배치되어 있으므로 구체를 겹치지 않게 가림
      if (fsScene.id === currentSceneId) return;

      const coords = getSceneCoords(fsScene.id, fsScene.zone);
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMatIdle.clone());
      nodeMesh.position.set(coords.x, coords.y + 0.3, coords.z);
      nodeMesh.name = fsScene.id;
      nodesGroup.add(nodeMesh);
    });
  }, [selectedExhibition, selectedFloor, currentSceneId, menuCollapsed]);

  // 5. 탐색 경로(Tube & Core Line & Target Pin) 렌더링 업데이트
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || menuCollapsed) return;

    // 기존 경로 오브젝트 해제
    if (routeTubeRef.current) {
      scene.remove(routeTubeRef.current);
      routeTubeRef.current.geometry.dispose();
      (routeTubeRef.current.material as THREE.Material).dispose();
      routeTubeRef.current = null;
    }
    if (routeLineRef.current) {
      scene.remove(routeLineRef.current);
      routeLineRef.current.geometry.dispose();
      (routeLineRef.current.material as THREE.Material).dispose();
      routeLineRef.current = null;
    }
    if (destPinRef.current) {
      scene.remove(destPinRef.current);
      destPinRef.current.geometry.dispose();
      (destPinRef.current.material as THREE.Material).dispose();
      destPinRef.current = null;
    }
    movingDotsRef.current.forEach((dot) => {
      scene.remove(dot);
      dot.geometry.dispose();
      (dot.material as THREE.Material).dispose();
    });
    movingDotsRef.current = [];

    if (route.length < 2) return;

    // Glow Tube 지오메트리 빌드
    const points: THREE.Vector3[] = [];
    route.forEach((step) => {
      points.push(new THREE.Vector3(step.position.x, step.position.y + 0.3, step.position.z));
    });

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, route.length * 6, 0.6, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      transparent: true,
      opacity: 0.6,
    });
    const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(routeTube);
    routeTubeRef.current = routeTube;

    // 가느다란 네온 코어 라인
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      linewidth: 3,
    });
    const routeLine = new THREE.Line(lineGeo, lineMat);
    scene.add(routeLine);
    routeLineRef.current = routeLine;

    // 최종 도착지 레드 핀 설치
    const destCoords = route[route.length - 1].position;
    const destPinGeo = new THREE.ConeGeometry(1.5, 5, 16);
    destPinGeo.rotateX(Math.PI);
    const destPinMat = new THREE.MeshPhongMaterial({
      color: 0xef4444, // red pin
      emissive: 0x3a0000,
    });
    const destPin = new THREE.Mesh(destPinGeo, destPinMat);
    destPin.position.set(destCoords.x, destCoords.y + 4, destCoords.z);
    scene.add(destPin);
    destPinRef.current = destPin;

    // 무빙 닷 메쉬 목록 생성
    const dotGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    const numDots = Math.min(route.length * 2, 8);
    const dots: THREE.Mesh[] = [];

    for (let i = 0; i < numDots; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      scene.add(dot);
      dots.push(dot);
    }
    movingDotsRef.current = dots;

    // 처음 경로를 탐색했을 때만 카메라 대상 정렬 (사용자 수동 줌/회전 중 snap 방지)
    if (controlsRef.current) {
      const centerPoint = new THREE.Vector3();
      points.forEach((p) => centerPoint.add(p));
      centerPoint.divideScalar(points.length);
      controlsRef.current.target.copy(centerPoint);
      controlsRef.current.update();
    }
  }, [route, menuCollapsed]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
