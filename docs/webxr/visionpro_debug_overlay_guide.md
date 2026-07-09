# Apple Vision Pro WebXR On-Screen Debug Overlay Guide

본 가이드는 Apple Vision Pro Safari 등 디렉트 자바스크립트 콘솔(Console) 로그 조회가 힘든 VR 기기 내에서, 실시간 렌더러 상태 및 WebXR 세션 진입 단계를 즉각적으로 모니터링하기 위해 구축된 **온스크린 디버그 오버레이(Debug Overlay) 및 console hook 유틸** 사용 설명서입니다.

---

## 1. 개요 및 세팅

이 디버그 콘솔은 개발 테스팅 모드에서만 선택적으로 가동되도록 환경변수 조건으로 제한되어 있습니다.

- **실행 명령어**:
  ```bash
  npm run dev_1
  ```
  이 스크립트는 `VITE_DEBUG_OVERLAY=true` 환경 변수를 셋업하여 Vite 서버를 가동합니다.
- **Vite 환경변수 가드**:
  코드 상에서 `import.meta.env.VITE_DEBUG_OVERLAY === "true"` 분기를 타기 때문에, 일반 `npm run dev` 실행이나 Production 배포 빌드(`npm run build`) 상황에서는 디버그 오버레이가 원천적으로 제거 및 미출력되어 상용 성능에 영향을 주지 않습니다.

---

## 2. 주요 기능 및 구성

화면 우측 하단에 고정형(Fixed Position) 반투명 패널로 나타나며, 아래와 같은 기능을 지원합니다.

### [1] WebXR 실시간 파라미터 모니터링 (16대 런타임 지표)
- **isSecureContext**: 브라우저 보안 컨텍스트 여부 (`true` 필수)
- **Protocol**: 현재 연결 프로토콜 (`https:` 또는 `localhost` 개발 중인 경우 `http:`)
- **Navigator XR**: 기기 내 `navigator.xr` 모듈 탑재 여부
- **Immersive VR Supported**: 기기의 `immersive-vr` 몰입 사양 지원 결과 (`true` 필수)
- **XR Enabled**: Three.js `renderer.xr.enabled` 활성 여부
- **XR Presenting**: 실제 네이티브 WebXR 세션 송출 중 여부 (`renderer.xr.isPresenting`)
- **Session Mode**: 활성화된 세션의 종류 (`immersive-vr` 필수)
- **vrMode / isPresenting**: 상위 React 상태 동기화 상태
- **Camera Pos / Quat**: Three.js 카메라의 XYZ 물리 좌표 및 회전 사원수
- **Sphere Mesh / Side**: 3D 파노라마 구체의 씬 마운트 여부 및 텍스처 렌더 면 사양 (`BackSide` 필수)
- **Texture Res / Image Ratio / Equirectangular**: 로드된 파노라마 리소스의 해상도 및 2:1 와이드 화각 검증 결과
- **Canvas Size / DPR**: WebGL 드로잉 영역 크기 및 디바이스 픽셀 밀도 비율

### [2] 전역 콘솔 훅 (Console Redirection Terminal)
- 앱 초기화와 동시에 `console.log`, `console.warn`, `console.error`, `console.info` 핸들러를 가로챕니다.
- 기기에서 동작하는 모든 스크립트 출력 메시지가 기존 브라우저 기본 콘솔로 통과됨과 동시에, 본 디버그 패널의 터미널 공간에 타임스탬프와 함께 누적 출력됩니다. (최대 300개 버퍼링 유지).
- 경고(`warn` - 주황) 및 에러(`error` - 빨강)가 시각적으로 강조되어 비전프로 글래스 안에서 에러 유무를 즉시 확인할 수 있습니다.

### [3] 유틸리티 컨트롤 버튼
- **Clear**: 터미널의 이전 로그 버퍼를 비워 줍니다.
- **Copy**: 현재까지 누적된 로그 덤프 전체를 디바이스 클립보드로 직접 복사합니다.
- **Collapse / Expand**: 패널을 우측 하단 구석에 콤팩트한 1줄짜리 헤더로 접어놓거나 복원합니다. (비전프로 Safari 뷰포트를 방해하지 않음).

---

## 3. 핵심 성공(Immersive) 판단 조건

비전프로에서 웹 VR을 실행했을 때, 진짜 360 공간 안으로 안정적으로 들어섰는지 판정하는 기준은 디버그 패널의 상부 지표가 다음과 같이 매칭되어야 합니다:

```text
Secure Context: true
Immersive VR: true
Session Mode: immersive-vr
XR Presenting: true
```

네 가지 중 하나라도 `false` 또는 `N/A`로 나타난다면 세션 획득 및 렌더 가동 실패 상태이므로 기기 제어를 다시 추적해야 합니다.
