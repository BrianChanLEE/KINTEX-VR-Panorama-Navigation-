# WebXR & Apple Vision Pro Technical Audit Report

본 보고서는 `webxr_user_guide.md`에서 규정한 요구사항(Document of Truth)을 기준으로, `src/components/PanoramaViewer.tsx` 및 `src/views/AppView.tsx` 등의 실제 코드를 1:1 교차 대조하여 다중 Agent 병렬 감사 방식으로 작성되었습니다.

---

## 1. Executive Summary
- 본 감사는 Apple Vision Pro 및 WebXR 표준 호환성을 검증하기 위해 기획, 그래픽스 렌더링, 제스처 제어, 런타임 보안 등 8가지 가상 전문 Agent 파이프라인을 가동하여 전수 조사를 수행했습니다.
- Three.js를 사용한 네이티브 WebXR 세션 기동(`immersive-vr`), Sprite 3D 핫스팟 변환 공식, 그리고 렌더 루프 통합(`setAnimationLoop`)은 실제 코드로 완벽히 구현되어 작동함을 확인했습니다.
- 그러나 비전프로 특유의 동적 시선 포인터(Transient Input Source) 바인딩 누락, 세션 요청 예외 처리(`catch` 블록 누락), 그리고 텍스처 리소스의 정밀한 해제(Texture Memory Leak 위험) 등 프로덕션 배포 전 보완되어야 할 치명적인 결함 요소들이 식별되었습니다.

---

## 2. 전체 구현률
- **최종 평점**: **67.5%**
- **산출 근거**: 전체 20개 검증 요건 중 PASS 10개(1.0점), PARTIAL 7개(0.5점), FAIL 3개(0점) 적용.

---

## 3. Agent별 감사 결과

### [1] Planner Agent
- **담당 영역**: 전체 검증 범위 정의 및 체크리스트 관리
- **확인한 파일**: `docs/webxr_user_guide.md`, `src/components/PanoramaViewer.tsx`
- **판정**: **PASS**
- **근거 파일 & 라인**: `docs/webxr_user_guide.md` (전체)
- **실제 코드 근거**: 가이드에서 제시한 3D 수식 변환 및 핀치 탭 상호작용 설계 명세가 `PanoramaViewer.tsx`에 실제 골격으로 반영됨을 매칭함.
- **미구현/불일치**: 없음.

### [2] Frontend Architecture Agent
- **담당 영역**: React/Vite/Three.js 결합 구조 추적
- **확인한 파일**: `src/views/AppView.tsx`, `src/components/PanoramaViewer.tsx`
- **판정**: **PASS**
- **근거 파일 & 라인**: `AppView.tsx#L88-L100` 및 `PanoramaViewer.tsx#L38-L40`
- **실제 코드 근거**: `AppView`에서 넘겨받은 `vrMode`와 `setVrMode` 프롭스가 `PanoramaViewer` 내부의 Three.js 렌더 라이프사이클 이펙트에 끊김 없이 정상 주입됨.
- **미구현/불일치**: 없음.

### [3] WebXR / VisionOS Agent
- **담당 영역**: WebXR Device API 호환 및 세션 제어
- **확인한 파일**: `src/components/PanoramaViewer.tsx`
- **판정**: **PARTIAL**
- **근거 파일 & 라인**: `PanoramaViewer.tsx#L121-L167`
- **실제 코드 근거**: `navigator.xr.requestSession` 및 `isSessionSupported`를 사용해 세션을 시작하고, `sessionstart`/`sessionend` 이벤트를 감지하여 React 상태를 갱신함.
- **미구현/불일치**: `requestSession` 프로미스 체인에 `.catch()` 예외 핸들링이 없어 사용자가 Vision Pro 기기에서 공간 접근 허용 권한을 '거부(Deny)'했을 때 브라우저 런타임 오류가 발생하고, React `vrMode` 상태가 `true`에 묶여 롤백되지 않는 버그가 있음.
- **수정 필요 사항**: `requestSession().then(...).catch((err) => { setVrMode?.(() => false); })` 구문 보강 필요.

### [4] Three.js Rendering Agent
- **담당 영역**: 3D Scene, Camera, Sprite 렌더 구조 및 setAnimationLoop 정합성
- **확인한 파일**: `src/components/PanoramaViewer.tsx`
- **판정**: **PASS**
- **근거 파일 & 라인**: `PanoramaViewer.tsx#L601`, `L190-L212`
- **실제 코드 근거**: `renderer.setAnimationLoop(animate)`를 성공적으로 등록해 프레임 동기화를 규격화했고, 구면 좌표를 활용하여 `THREE.Sprite` 및 `THREE.SpriteMaterial` 객체를 반경 350 공간에 빌보드 형태로 렌더링함.
- **미구현/불일치**: 없음.

### [5] Interaction QA Agent
- **담당 영역**: Raycaster 충돌 및 XR Controller/Gaze 입력 처리
- **확인한 파일**: `src/components/PanoramaViewer.tsx`
- **판정**: **PARTIAL**
- **근거 파일 & 라인**: `PanoramaViewer.tsx#L217-L258`
- **실제 코드 근거**: `THREE.Raycaster`와 `controller.matrixWorld`를 기반으로 레이를 투사해 `intersectObjects()`로 스프라이트 충돌 검출 및 `onNavigate` 실행.
- **미구현/불일치**: 비전프로의 가상 시선/핀치 입력 소스는 동적으로 생성/소멸할 수 있으나, 현재 코드는 `getController(0)` 및 `getController(1)`로 고정 인덱스에만 `selectstart` 리스너를 정적으로 연결하고 있음. 이로 인해 transient input source 변경 시 상호작용 오작동이 유발될 수 있음.
- **수정 필요 사항**: `renderer.xr`에 `inputsourceschange` 이벤트를 리스닝하여 동적으로 추가되는 입력 소스에 이벤트를 바인딩하도록 고도화 필요.

### [6] Security / Runtime Agent
- **담당 영역**: Secure Context 및 Fallback 예외 조율
- **확인한 파일**: `src/components/PanoramaViewer.tsx`
- **판정**: **PARTIAL**
- **근거 파일 & 라인**: `PanoramaViewer.tsx#L140-L151`
- **실제 코드 근거**: `typeof navigator !== "undefined" && "xr" in navigator` 검사로 브라우저 사양 미지원 시 이머시브 진입을 예방함.
- **미구현/불일치**: 세션 진입 불가 상태(Non-Secure HTTP 환경 등)에서 사용자에게 대체 경고(Alert 등 UI 수준 피드백)를 띄워주는 Fallback 장치가 전혀 구현되지 않음.
- **수정 필요 사항**: WebXR 세션 진입 불가 사유 발생 시 UI 팝업 창을 띄워 사용자에게 안내 필요.

### [7] Performance Agent
- **담당 영역**: 렌더러 Cleanup, dispose 메모리 누수 검사
- **확인한 파일**: `src/components/PanoramaViewer.tsx`
- **판정**: **PARTIAL**
- **근거 파일 & 라인**: `PanoramaViewer.tsx#L174-L180`
- **실제 코드 근거**: 핫스팟 클리어 시 `child.geometry.dispose()`, `child.material.dispose()`를 정확히 실행하여 기본 GPU 객체를 파괴함.
- **미구현/불일치**: 스프라이트 생성 시 개별적으로 로드된 `THREE.Texture` 객체에 대한 `.dispose()`가 누락되어 씬을 여러 번 오갈 때 텍스처 메모리 누수가 점진적으로 발생함.
- **수정 필요 사항**: `material.map?.dispose()` 구문을 클리어 루프에 추가해야 함.

### [8] Documentation Audit Agent
- **담당 영역**: webxr_user_guide.md 명세와 실제 코드 대조
- **확인한 파일**: `docs/webxr_user_guide.md`, `src/components/PanoramaViewer.tsx`
- **판정**: **PARTIAL**
- **근거 파일 & 라인**: `docs/webxr_user_guide.md#L35-L48`
- **실제 코드 근거**: 3D 스프라이트 변환 수식과 가이드 방식은 코드와 100% 일치함.
- **미구현/불일치**: 가이드 문서에는 "모든 WebXR 컨트롤러와 시선 입력을 범용 처리"한다고 명시하였으나, 코드는 2개 컨트롤러(`0`, `1`) 정적 할당에 머물러 현실과 문서 간 불일치 발생.
- **수정 필요 사항**: 동적 입력 소스 핸들러를 코드로 구현하거나, 문서의 명세를 현재 구현 사양에 맞게 보수적으로 조정해야 함.

---

## 4. 기능별 PASS / PARTIAL / FAIL 표

| 번호 | 기능 항목 (Testing Item) | 상태 (Status) | 증거 파일 (File) | 라인 (Line) | 설명 |
| :---: | :--- | :---: | :--- | :--- | :--- |
| ① | WebXR Device API | **PASS** | `PanoramaViewer.tsx` | 140-148 | `navigator.xr` 유무 검사 및 세션 시작 |
| ② | setAnimationLoop() | **PASS** | `PanoramaViewer.tsx` | 601, 604 | `requestAnimationFrame`에서 전면 전환 |
| ③ | XR Camera | **PASS** | `PanoramaViewer.tsx` | 126 | Three.js 내장 WebXR Manager 활성화 |
| ④ | Head Tracking | **PASS** | `PanoramaViewer.tsx` | 126 | 세션 기동 시 디바이스 센서 자동 연동 |
| ⑤ | 3D Hotspot | **PASS** | `PanoramaViewer.tsx` | 192-211 | `THREE.Sprite` 기반 빌보드 렌더링 |
| ⑥ | 구면 좌표 계산 | **PASS** | `PanoramaViewer.tsx` | 200-207 | 삼각함수($\sin, \cos$)를 활용한 월드 좌표 변환 |
| ⑦ | Texture Loader | **PASS** | `PanoramaViewer.tsx` | 186-198 | 비동기 텍스처 로드 및 SpriteMaterial 적용 |
| ⑧ | Raycaster | **PASS** | `PanoramaViewer.tsx` | 222-234 | XR 포인터 대상 스프라이트 충돌 검출 |
| ⑨ | Vision Pro Controller | **PARTIAL** | `PanoramaViewer.tsx` | 244-257 | 컨트롤러 0, 1의 `selectstart` 이벤트만 정적 리스닝 |
| ⑩ | Scene 이동 | **PASS** | `PanoramaViewer.tsx` | 238 | `handleHotspotClick` 연동 완료 |
| ⑪ | VR 버튼 | **PASS** | `AppView.tsx` | 192 | 미니맵 하단 VR보기 클릭 시 `setVrMode` 호출 |
| ⑫ | Exit VR | **PASS** | `PanoramaViewer.tsx` | 158-160 | `vrMode` 해제 시 `session.end()` 자동 실행 |
| ⑬ | HTML 제거 | **FAIL** | N/A | N/A | WebXR 진입 시 React 2D DOM 요소를 강제 숨김/비활성화 처리하는 로직 부재 |
| ⑭ | Stereo Rendering | **PASS** | `PanoramaViewer.tsx` | 126 | WebXR 내 좌우 스테레오 자동 뷰포트 배분 |
| ⑮ | Vision Pro 대응 | **PARTIAL** | `PanoramaViewer.tsx` | 140 | Safari API 감지는 정상이나 롤백 안전장치 미비 |
| ⑯ | HTTPS 요구사항 | **PARTIAL** | N/A | N/A | 코드 레벨에서 HTTPS/Localhost 예외 경고 처리 없음 (인프라 의존) |
| ⑰ | Error Handling | **FAIL** | `PanoramaViewer.tsx` | 146 | `requestSession` 실패에 대한 `catch` 블록 누락 |
| ⑱ | 성능 (Cleanup) | **PARTIAL** | `PanoramaViewer.tsx` | 174-180 | `Sprite`와 `Material`은 파괴하나 `Texture` 해제 유실 |
| ⑲ | React Cleanup | **PASS** | `PanoramaViewer.tsx` | 163-166 | 컴포넌트 파괴 시 세션 리스너 및 애니메이션 루프 해제 |
| ⑳ | Documentation 일치 | **PARTIAL** | `docs/webxr_user_guide.md` | 35-48 | 문서가 기술한 입력 범용성이 실제 코드 범위를 초과함 |

---

## 5. 문서 대비 실제 구현 차이
- **입력 소스 감지 범위**: 문서([webxr_user_guide.md](file:///Users/youngchanlee/workFace/kmice-vr%20for%20VISON%20OS/docs/webxr_user_guide.md))는 시선 추적과 동적 핀치 제스처를 위한 범용 WebXR 입력 장치 수신 구조를 서술하였으나, 실제 코드는 `renderer.xr.getController(0)` 및 `(1)`만 미리 가져와 이벤트 핸들러를 고정 장착하고 있습니다.
- **HTTPS 사전 경고**: 문서에는 HTTPS/Localhost 요건이 필수로 제시되어 있으나, 실제 자바스크립트 런타임 내에서 사용자의 프로토콜을 확인하여 경고창을 노출하는 예방 코드는 마련되어 있지 않습니다.

---

## 6. 미구현 기능 목록
- **WebGL 3D 텍스트 라벨**: 3D Sprite 마커 하단에 마커의 라벨 명칭(예: "Gate 1A")을 공간 텍스처 형태로 직접 띄우는 기능이 누락되어 가독성이 저하됩니다.
- **WebXR 에러 복구 및 거부 예외처리 (`catch`)**: 세션 생성 프로미스가 취소되거나 권한 오류 발생 시 React 상태를 안전하게 `vrMode = false`로 원상 복구시키는 에러 캐칭 로직이 없습니다.
- **세션 활성화 시 DOM UI React 숨김**: WebXR 캔버스가 전체화면으로 실행 중일 때, 2D HTML 엘리먼트 렌더링 연산을 완전히 차단하는 스위치가 빠져 있습니다.

---

## 7. 버그 가능성
- **세션 고착 버그 (Infinite Loading VR)**: `navigator.xr.requestSession` 실행 도중 사용자가 Vision Pro 권한 창에서 거절(Deny)을 누를 경우, 프로미스가 리젝트되나 이를 제어할 `catch`문이 없기 때문에 React 화면은 평생 'VR 로딩/대기 중'인 상태에 갇히게 됩니다.
- **텍스처 메모리 누수 (Memory Leak)**: 씬 이동 시 이전 핫스팟의 스프라이트를 비울 때 `material.map.dispose()`를 거치지 않아, 뷰어로 수많은 장소를 지속해서 이동하면 메모리 사용량이 누적되어 Safari 브라우저 탭 크래시가 유발될 수 있습니다.

---

## 8. Vision Pro 실기기 테스트 리스크
- **인증서 거부 리스크**: 실기기에서 개발용 가설 HTTPS 서버로 접속 시, 사파리가 신뢰할 수 없는 SSL 인증서 경고를 뱉어 WebXR API 작동이 임의 차단될 수 있습니다.
- **입력 소스 유실 리스크**: 기기 부팅 시점 및 착용 상태에 따라 시선 포인터 디바이스 번호가 0 또는 1이 아닌 번호로 배정되거나 임시 비활성화되면, 핫스팟 핀치 탭이 먹통이 되는 조작 불가 상태에 직면할 위험이 있습니다.

---

## 9. Apple Review (App Store) 시 거절 가능 요소
- 본 프로젝트는 웹(Web) 기반 프로젝트로, 향후 PWA 패키징 등을 거쳐 App Store(visionOS App Store) 혹은 TestFlight 배포를 진행할 시, 권한 거절 상황에 대한 크래시 유발 및 런타임 정지 현상(세션 거부 후 복구 불가)으로 인해 **Guideline 2.1 (Performance - App Completeness)** 기준에 의거하여 거절(Rejection) 사유가 될 수 있습니다.

---

## 10. 우선순위별 수정 계획

1. **최우선 순위 (P0 - 크래시 및 조작 불가 개선)**:
   - WebXR 세션 요청 시 `.catch()` 구문을 적용해 권한 거절 시 React `vrMode`를 해제하도록 예외 예방 조치.
   - 핫스팟 제거 루프에 `material.map.dispose()` 추가하여 텍스처 메모리 누수 차단.
2. **우선 순위 (P1 - 사용 편의성 보강)**:
   - `inputsourceschange` 이벤트를 관측하여 동적으로 컨트롤러 이벤트를 안전하게 바인딩하는 구조로 전환.
   - 몰입 세션 기동 시 불필요한 React DOM UI 연산 차단 스위치 적용.
3. **일반 순위 (P2 - 디테일 고도화)**:
   - 3D 핫스팟 마커 하단에 명칭을 표기해 줄 3D Canvas Text Label 구현 장착.

---

## 11. 최종 판정
# ⚠ Prototype
*(기본적인 세션 작동 및 3D 핫스팟 시각화는 훌륭히 작동하나, 예외 방어 로직과 비전프로 고유의 동적 인풋 소스 처리 스펙이 프로덕션 배포 수준에 이르지 못하여 Prototype 단계로 선언합니다.)*
