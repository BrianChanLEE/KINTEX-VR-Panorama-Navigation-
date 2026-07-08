# KINTEX VR Panorama Navigation  
# Architecture & Technical Implementation Report

**Project:** KINTEX VR Reconstruction  
**Document ID:** KINTEX_VR_ARCHITECTURE_IMPLEMENTATION_REPORT  
**Version:** 1.0  
**Date:** 2026-07-09  
**Classification:** Technical Architecture & Implementation Report  
**Production Live URL:** [GitHub Pages Live Demo](https://sic2027vxwebyc.github.io/KINTEX-VR-Panorama-Navigation-/)

---

# 1. Project Overview

## Project Background
본 프로젝트는 기존 **`VX_WEB_DEMO`** 프로젝트의 핵심 아키텍처를 계승하여 개발되었으며, 그중 **AR/VR 실내·외 공간 내비게이션(Pathfinding)** 및 **360° 파노라마 기반 3D 공간 탐색 기능**을 독립적인 프로젝트로 정교하게 분리하여 재설계한 고도화 시스템입니다.

기존 데모 프로젝트의 공간 탐색 유산을 단순 이관하는 것에 그치지 않고, WebGL 기반 파노라마 렌더링 파이프라인, 모듈형 Scene 레지스트리 관리, MVC 패턴 기반 소스 구조화, Hotspot Navigation 데이터 교정 프레임워크, 그리고 유지보수 생산성 극대화를 실현하기 위한 별도의 독립 아키텍처로 완전 재구축하였습니다. 이를 통해 향후 WebXR 및 차세대 공간 안내 플랫폼으로 기능적 확장이 가능하도록 최적의 설계 기반을 제공합니다.

---

## Project Objectives
본 프로젝트는 다음과 같은 설계 목표를 충족하도록 설계되었습니다.
* **Three.js WebGL 구면 투영**: 360° 고해상도 구형 파노라마 공간 렌더링 및 모바일/웹 드래그 관성 터치 인터랙션 지원.
* **Scene 기반 공간 내비게이션**: Scene 간 연결 구조(Target) 유기적 네비게이션 제어.
* **Floor(Zone) 단위 공간 이동**: 대규모 전시홀 층(Zone)별 자동 분류 배치 및 필터링 이동 제공.
* **Hotspot 기반 사용자 상호작용**: 공간 전이(`nav`), 설명 카드 노출(`info`), 랜드마크 마킹(`poi`) 등 다기능 컴포넌트 탑재.
* **시설 상세 정보 제공**: 언어 설정(KOR/ENG)에 맞춘 다국어 일반/안전/공간 정보 서랍 패널 제공.
* **개발 전용 Hotspot Position Editor**: 브라우저 상에서 마우스 드래그 조정을 통해 위/경도 오차 편차를 실시간 파일 저장(Save/Reset)하는 교정 편집 환경 지원.

---

## Project Scope
본 프로젝트의 구현 범위는 다음과 같습니다.
* **Panorama Viewer Container & View**: Three.js 렌더링 컨텍스트 싱글톤 관리 및 텍스처 메모리 스왑 뷰.
* **Scene / Hotspot / Floor Navigation Controller**: MVC 패턴 기반의 모듈화된 비즈니스 상태 훅 세트.
* **Information Panel & MiniMap**: 다국어 번역 사전 서비스 및 방위계 관성 회전 물리식 동기화 모듈.
* **Hotspot Position Editor**: 개발자 드래그 오버라이드 REST API 시스템.
* **E2E 및 Visual Parity 테스트**: Playwright 프레임워크 기반의 화면 좌표 오차 자동화 검증 환경.

---

# 2. System Architecture

## Overall Architecture
프로젝트는 UI 렌더링 계층(View), 상태 및 상호작용 흐름 제어 계층(Controller), 핵심 도메인 논리 연산 계층(Service), 그리고 데이터 원천 구조 정의 계층(Model)으로 분리하여 각 레이어 간의 결합도를 최소화하였습니다.

```text
                                  User Input
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        Presentation Layer (View)                    │
    │   - AppView           - PanoramaView           - MiniMapView        │
    │   - FloorSelectorView - InfoPanelView          - SceneDropdownView  │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │ (State / Callbacks Binder)
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        Control Layer (Controller)                   │
    │   - useNavigationController   - useEditorController                 │
    │   - useSceneController        - useHotspotController                │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │ (Domain Methods Resolver)
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         Logic Layer (Service)                       │
    │   - scene.service    - hotspot.service    - override.service        │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │ (Entity Models Mapping)
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         Data Layer (Model)                          │
    │   - scene.model      - hotspot.model      - editor.model            │
    └─────────────────────────────────────────────────────────────────────┘
```

이 고도화된 레이어 설계를 통하여 렌더링 엔진(Three.js)의 갱신에 따른 비즈니스 논리의 수정을 제거하였으며, 각 모듈의 단위 테스트(Unit Test) 작성이 매우 용이합니다.

---

# 3. Core Components

### 3.1 Panorama Viewer (Three.js WebGL Container)
360° 파노라마 구면 이미지를 렌더링하는 실시간 WebGL 엔진입니다.
* **Flipped Geometry**: 구 sphere geometry 크기를 x축 반전(`scale(-1, 1, 1)`)하여 카메라가 구체의 정중앙에서 내부 면을 바라보도록 설정.
* **Texture Recycling**: 씬 이동 시 Renderer 컨텍스트를 파괴하지 않고 텍스처 메모리 및 구면 메터리얼(`MeshBasicMaterial`) 정보만 즉각 스왑하여 컨텍스트 분실(Context Lost) 현상을 예방.
* **Touch Pinch & Zoom**: 두 점 포인터 간의 거리를 역산해 시야각(FOV) 값을 32~90도로 동적 보정.

### 3.2 Scene Navigation
`scenes.ts` 레지스트리를 읽어 현재 활성화된 씬 ID에 적합한 구형 좌표 정보를 인출하고, 대상 구역(Zone) 탭에 어울리는 씬 리스트 정보를 바인딩합니다.

### 3.3 Hotspot Navigation
사용자가 파노라마 화면 내에서 시각적 공간 전이를 경험할 수 있도록 2D 평면 위에 3D 벡터를 NDC(Normalized Device Coordinates) 투영 계산으로 매핑 렌더링합니다.

| 핫스팟 타입 (Kind) | 설명 (Description) | 예시 동작 (Action Example) |
| :--- | :--- | :--- |
| **`nav`** | 공간 이동 전용 핀 마커 | 클릭 시 해당 타겟 씬(lobby, hall 등)으로 화면 슬라이드 갱신 |
| **`info`** | 팝업 안내 마커 | 클릭 시 화면 좌측의 시설 상세 정보 정보 패널 호출 |
| **`poi`** | 위치 랜드마크 설명판 | 주요 건축물이나 장소 상단에 정적 카드 오버레이 |

### 3.4 Floor Navigation
전시홀 구역 대분류에 대응하여, 구역 대분류 선택 시 해당 영역에 배정된 가장 첫 번째 씬으로 자동 안전 전이를 스케줄링합니다.

### 3.5 Information Panel
시설별 정보 서랍 드로어 컴포넌트이며, 정적 사전 매핑 함수 `translateLabel()`, `translateValue()`를 통해 데이터 자체의 손상 없이 로컬 UI 단독으로 다국어 다차원 필터를 즉각 대응합니다.

### 3.6 MiniMap
뷰어 렌더링 루프 내부의 requestAnimationFrame을 가로채 관성 각도 수치를 계산하고 Compass 바늘과 시야각 삼각형 영역(Cone)의 CSS `transform` 속성에 직접 DOM 주입하여 부드러운 회전을 보장합니다.

---

# 4. Data Architecture

모든 파노라마 씬 데이터는 형식 안정성(Type-safe)이 보장된 JSON 스키마를 따릅니다.

```text
Scene Entity
├── id (String)               - 고유 씬 식별 키 (예: aerial01)
├── ko (String)               - 한국어 노출용 타이틀
├── en (String)               - 영어 노출용 타이틀
├── index (String)            - 투어 인덱스 시퀀스 번호
├── zone (ZoneId)             - 소속 전시홀 구역 식별 키
├── img (String)              - 로컬 파노라마 이미지 배경 소스 경로
├── startLon (Number)         - 씬 진입 초기 수평 각도 (deg)
├── startLat (Number)         - 씬 진입 초기 수직 각도 (deg)
└── hotspots (Array)
     ├── id (String)          - 핫스팟 고유 식별 키
     ├── lon (Number)         - 3D 구형 공간 상의 수평 경도 (ath)
     ├── lat (Number)         - 3D 구형 공간 상의 수직 위도 (atv)
     ├── label (String)       - 한국어 마커 출력명
     ├── labelEn (String)     - 영어 마커 출력명
     ├── kind (HotspotKind)   - nav / info / poi 지정 키
     ├── target (String)      - 이동 타겟 씬 ID
     └── url (String)         - 마커 핀 아이콘 리소스 경로
```

---

# 5. Rendering Pipeline

파노라마 공간 매핑의 실시간 연산 흐름은 다음과 같은 데이터 전파 구조를 지닙니다.

```text
[1. User Input Trigger]
        │ (Pointer Drag / Mouse Wheel)
        ▼
[2. Controller State Update]
        │ (lonRef / latRef / fovRef 수치 산출)
        ▼
[3. Three.js Renderer calculation]
        │ (degToRad 삼각함수 구형 좌표 계산 -> Vector3 3D 카메라 투영)
        ▼
[4. NDC coordinate Mapping]
        │ (2D Viewport 스크린 좌표계로 Projected 변형)
        ▼
[5. Virtual DOM Placement]
        │ (transform: translate3d 속성 값 주입)
        ▼
[6. DOM Paint (GPU rendering)]
```

---

# 6. Hotspot Position Editor

공간 각도 오차 보정 프로세스를 단순화하기 위해 드래그 앤 드롭 방식의 교정 전용 에디터 프레임워크를 제공합니다.

### 6.1 동작 아키텍처
```text
                    [ UI Hotspot Drag ]
                             │
                             ▼
              [ panoramaProjection Utility ]
              (Raycaster shoot -> Spherical angles 계산)
                             │
                             ▼
                [ Editor Local Server API ]
                    (/__hotspot-editor/save)
                             │
                             ▼
         [ hotspot-position-overrides.json 업데이트 ]
```

### 6.2 데이터 정합성 우선순위 (Resolution Priority)
최종 렌더링에 노출되는 좌표값은 아래의 3단계 오버라이드 해석 우선순위를 준수합니다.

```text
[우선순위 1]  hotspot-position-overrides.json (수동 교정 데이터 우선 반영)
     ▲
     │
[우선순위 2]  src/data/scenes.ts (정적 설계 기본 원천 좌표)
     ▲
     │
[우선순위 3]  기본 각도 (0, 0)
```

---

# 7. Technology Stack

* **Core Language**: TypeScript (~5.6.3)
* **Core Library**: React (18.3.1)
* **Bundler & Tooling**: Vite (6.3.5)
* **3D Viewport**: Three.js (0.169.0)
* **Styling**: TailwindCSS (3.4.17)
* **E2E Driver**: Playwright (1.61.1)
* **Package Manager**: Bun

---

# 8. Project Structure

```text
src/
├── models/         # 씬 데이터, 핫스팟, 정보 서랍 규격 인터페이스 (Model)
├── services/       # 비즈니스 도메인 연산 및 오버라이드 REST API (Service)
├── controllers/    # 각 뷰 컴포넌트 이벤트 연동용 리액트 훅 (Controller)
├── views/          # 100% 상태 관리가 배제된 프리젠테이션 컴포넌트 (View)
├── components/     # 호출 지점 보존용 컨트롤러 데코레이터 및 전역 마크업
├── data/           # 씬 데이터셋 원본 및 교정용 Overrides JSON 파일
├── utils/          # 극좌표 투영 계산 공식 및 검증 가드 헬퍼
└── index.css       # 메인 글래스모피즘 테마 스타일시트
```

---

# 9. Automated Testing

Playwright E2E 비교 테스트 체계를 탑재하여 변경 사항으로 인한 화면 깨짐 및 핫스팟 위치 탈조를 방지합니다.
* **Visual Comparison**: 원본 KINTEX 파노라마와 로컬 복원 화면 간의 픽셀 X/Y 좌표 편차를 측정하여 5px 이내인 경우 통과 처리.
* **Dynamic Transition Audit**: 층수 변경 클릭 시, 비동기 파노라마 렌더러의 크로스페이드 씬 전환이 충돌 없이 완료되는지 보장.

---

# 10. Design Principles

* **SoC (관심사 분리)**: 3D 파노라마 렌더링 엔진 내부 연산과 사용자 일반 UI 레이어를 분리.
* **Stateless View**: 모든 UI 레이아웃은 스스로 상태를 갖지 않는 View 형태로 고립시켜 재사용성을 증가시킴.
* **Fail-Safe Fallback**: 외부 핀 아이콘 CDN 로드 에러 감지 시, `isKintexPin` 수신기 및 `animate-floaty` 기반 로컬 카드 핀으로 자동 전환 처리하여 오류 없는 서비스 보장.

---

# 11. Future Roadmap

* **WebXR 가상현실 투어 연계**: 모바일 디바이스 자이로센서 연동 및 VR 기글 글래스 뷰 입체 매핑.
* **AR 내비게이션 길찾기 실시간 추적**: 실시간 길안내 경로선 Three.js 3D 라인 동적 투영 기능 추가.

---

# 12. Conclusion

KINTEX VR Panorama Navigation 프로젝트는 기존 `VX_WEB_DEMO` 프로젝트의 길찾기 내비게이션 기반 구조를 바탕으로, 현대적 웹 프레임워크 표준(MVC 패턴)과 고성능 3D WebGL 렌더링 설계를 융합하여 독자적인 공간 탐색 아키텍처로 새롭게 구현되었습니다. 

본 아키텍처는 렌더링 구조의 결합도 해소, 데이터 기반 관리, 드래그 수정 에디터 및 안정적인 E2E 테스트 검증 스위트를 통틀어 최상의 개발 유연성과 무장애 공간 탐색 경험을 보장합니다.

---

**Report Compiled by:**  
*VX WEB Team (CTC DX)*  
**Document Version:** 1.0  
**Classification:** Technical Architecture & Implementation Report
