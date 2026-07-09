# KINTEX VR 신규 작업 기능 구현 보고서 (Post-Push Report)

본 보고서는 마지막 Git 커밋(`d4b2fac8a - docs: add Live Demo URL to README and Tech Report`) 이후 새롭게 구현 및 추가된 기능들과 설계 문서 리스트를 기술합니다.

---

## 1. 8대 신규 핵심 기능 개요 (Summary of Key Features)

마지막 커밋 이후 킨텍스 VR 프로젝트의 인터랙션, 사용자 편의성, XR 몰입감 향상을 위해 다음 기능들이 새롭게 개발되었습니다:

1. **통합 검색 시스템 (`SearchPanel.tsx` 추가)**
   - 씬(Scene) 정보 및 핫스팟(POI, 네비게이션 마커) 리스트를 아우르는 다국어(KOR/ENG) 실시간 통합 검색 시스템 구현.
2. **검색 결과 뷰포트 자동 포커싱**
   - 검색 결과 클릭 시 해당 씬으로 즉시 이동 후, 카메라 시점을 핫스팟 좌표로 부드럽게 바라보게(`lookAtPosition`) 연동.
3. **도슨트 가이드 투어 (전시 가이드)**
   - 킨텍스 항공 뷰에서부터 제1전시장 내부까지 각 단계별 정해진 설명(KOR/ENG 자막)과 카메라 워킹을 제공하는 자동 안내 가이드 기능.
4. **대피 훈련 시뮬레이션 (소방 및 안전 가이드)**
   - 비상 상황을 가정하여 1전시장 로비에서 Gate 1A 광장 및 실외 안전 대피 장소까지 비상구 유도선(3D Green Arrows Flow)과 대피 자막을 결합한 동적 모드 구현.
5. **3D WebGL 비상 대피 유도 화살표 구현**
   - 소방 안전 모드 활성화 시, 카메라 바닥면(-12m 높이)에 비상구 방향으로 흐르는 듯이 움직이는(Pulse 애니메이션 적용) 3D WebGL 녹색 유도 화살표 다이나믹 생성.
6. **실시간 핫스팟 위치 수정/저장 에디터 모드**
   - 환경 변수 `VITE_HOTSPOT_EDIT_MODE=true` 설정 시 작동하는 드래그 앤 드롭 방식의 핫스팟 좌표 수정 기능.
   - 드래그 완료 시 오버라이드 데이터(`hotspot-position-overrides.json`) 및 로컬에 수정본 임시 저장/내보내기 기능 완비.
7. **신규 핫스팟 실시간 추가 및 삭제 기능**
   - 에디터 모드에서 화면 빈 곳을 더블클릭/클릭하여 핫스팟의 종류(이동 마커/안내 마커), 타겟 씬, 다국어 라벨 등을 입력해 즉석으로 배치하고 삭제할 수 있는 관리 모드 모달 추가.
8. **Apple Vision Pro (WebXR) Immersive VR 모드**
   - 비전프로 등 XR 헤드셋 접속 시 네이티브 `immersive-vr` 세션을 시작하여 360도로 고개를 돌리며 파노라마를 감상할 수 있는 WebXR 스펙 구축.
   - WebXR 공간 속 3D Sprite 핫스팟 동적 렌더링 및 시선 + 핀치 제스처 클릭을 처리하는 WebXR Raycaster 제스처 핸들링 구현.

---

## 2. 파일별 변경 상세 (Detailed File Modifications)

### 📁 Source & Views
- **`src/App.tsx`**
  - 통합 검색 선택 시 핫스팟 강조용 하이라이트 상태(`highlightedHotspotId`) 연동.
  - 전시 및 대피 가이드 투어 시 자막 동기화 및 타임아웃 기반 자동 씬 전이 상태 엔진 탑재.
- **`src/components/PanoramaViewer.tsx`**
  - WebGL 렌더링 루프를 `renderer.setAnimationLoop`로 대체하여 WebXR 호환.
  - WebXR 세션 시작/종료 이벤트 리스너와 React 상태 바인딩.
  - VR 환경 진입 시 HTML 요소를 대체할 `THREE.Group` 기반 3D Sprite 핫스팟 마커 동적 변환 및 배치 처리.
  - WebXR 컨트롤러 입력을 수신하여 공간 상의 Sprite를 클릭할 수 있는 `Raycaster` 충돌 검출 연동.
- **`src/components/SearchPanel.tsx` (신규 추가)**
  - 검색 UI, 결과 목록 렌더링, 다국어 자소 일치 검색 헬퍼 내장.
- **`src/views/AppView.tsx`**
  - 가이드 투어 및 대피 훈련 시작/종료 컨트롤 배너 UI 추가.
  - 대피 및 전시 도슨트 투어 시 화면 하단에 띄울 통합 자막 플레이어 오버레이 디자인 적용.
  - `<PanoramaViewer>` 컴포넌트로 `vrMode`, `setVrMode` 및 하이라이트 ID 전달 연동.
- **`src/data/added-hotspots.json` (신규 추가)**
  - 사용자가 에디터 모드에서 생성한 신규 핫스팟들을 보관하기 위한 데이터 저장 파일.

### 📁 E2E Tests
- **`tests/e2e/kintex-vr-features-audit.spec.ts` (신규 추가)**
  - 통합 검색, 가이드 투어 시작/종료, 에디터 모드 전환 등 새롭게 추가된 핵심 8대 인터랙티브 기능들이 사용자 흐름대로 올바르게 작동하는지 종합 감사하는 신규 Playwright 스펙 파일 작성.

### 📁 설계 및 기획 문서 (New Untracked Docs)
- **`docs/vision_pro_planning.md`**
  - 비전프로(visionOS Safari) 대응을 위한 기능 전반 기획서.
- **`docs/visionos_xcode_setup.md`**
  - visionOS 빌드 및 Xcode 프로젝트 연동 가이드 문서.
- **`docs/webxr_interaction_design.md`**
  - WebXR Immersive 세션 내 3D 공간 상호작용 및 레이캐스터 작동 방안을 기술한 상세 스펙 문서.

---

## 3. 향후 유지보수 지침 (Maintenance Guidelines)
- **핫스팟 데이터 업데이트**: 핫스팟 좌표를 드래그하여 수정한 후, 에디터 화면 우측 상단의 `Export JSON` 버튼을 눌러 생성된 데이터를 `src/data/hotspot-position-overrides.json` 파일에 병합하여 배포합니다.
- **WebXR 개발 로컬 테스트**: 비전프로 등 기기에서 WebXR을 직접 테스트하려면, Vite 개발 서버 실행 시 HTTPS 인증서를 적용하거나 주소를 `localhost`로 터널링해 WebXR API의 보안 컨텍스트 제약을 충족해야 합니다.
