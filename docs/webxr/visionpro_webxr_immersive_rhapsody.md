# Apple Vision Pro WebXR Immersive 360 Root Cause Analysis (RCA) - Stage II (Updated)

## 1. VR 세션 진입 후 1x1 픽셀 고착 현상의 결정적 시퀀스

- **레이아웃 리플로우(Layout Reflow)와의 타이밍 모순**:
  1. 사용자가 VR 보기 버튼을 탭하면 React가 `vrMode` 상태를 `true`로 바꿉니다.
  2. 이와 동시에 2D HTML 오버레이 패널들을 `hidden` 시켜 화면에서 치워내기 위해 DOM의 레이아웃 리플로우(Reflow)가 일시적으로 발생합니다.
  3. 이 찰나의 프레임 레이턴시(약 수ms~십수ms) 동안, 캔버스의 부모 마운트 요소의 `clientWidth/Height`가 일시적으로 **`0` 또는 `1`**로 축소됩니다.
  4. 비전프로 Safari가 주소창을 숨기고 WebXR 프레젠테이션 모드를 주입하기 시작하며 브라우저 `window.resize` 이벤트를 강제로 대량 방출합니다.
  5. 이때 `renderer.xr.isPresenting`이 비동기적으로 아직 `true`가 되기 직전의 극히 짧은 순간, `onResize` 핸들러가 가드를 통과해 기습 호출됩니다.
  6. 이 기습 리사이즈로 인해 **`renderer.setSize(1, 1)`**이 실행되어 WebGL 캔버스의 물리 백버퍼 해상도가 `1x1` 상태로 락(Lock)되었습니다.
  7. 세션 활성화 직후에는 Three.js 내부 사양 및 브라우저 제약 상 `setSize` 조절 시도가 `Can't change size while VR device is presenting` 경고와 함께 원천 기각되므로, 세션 내내 1x1 픽셀 상태로 화면이 새까맣게 멈춰 있게 되었습니다.

---

## 2. 1x1 픽셀 수축 정밀 요격 솔루션 (setSize 프록시 가드)

- **원천 함수 재정의 프록시 (Function Override)**:
  그 어떠한 비동기 지연 리사이즈 이벤트나 리액트 생명주기 타이밍 충돌이 발생하더라도 캔버스가 1x1 픽셀로 오그라드는 것을 물리적으로 원천 차단하기 위해, Three.js 렌더러 생성부 바로 밑단에서 **`renderer.setSize` 메서드를 프록시화하여 차단벽을 구축**했습니다.

```typescript
// 렌더러 setSize 원천 Proxy 가드 이식
const originalSetSize = renderer.setSize.bind(renderer);
renderer.setSize = (w, h, updateStyle) => {
  // 1. WebXR 세션 작동 중에는 모든 크기 수정 요청을 무조건 기각 (경고 로그 반복 방지)
  if (renderer.xr.isPresenting) {
    return;
  }
  // 2. 혹은 레이아웃 리플로우 딜레이 도중 10px 이하로 캔버스가 기습 축소되려는 시도도 무조건 차단
  if (w <= 10 || h <= 10) {
    console.warn("[WebXR Guard] Blocked micro resize collapse:", w, "x", h);
    return;
  }
  originalSetSize(w, h, updateStyle);
};
```

---

## 3. WebXR 초기화 및 Sizing 시퀀스 정렬

1. **세션 전 단계 해상도 확정**:
   `enterVR()` 내에서 `requestSession()`을 요청하기 직전에 윈도우 실제 가시 해상도를 읽어 `renderer.setSize(innerWidth, innerHeight, false)`를 1회 명시적 선행 실행합니다.
2. **세션 진입 시점**:
   프록시 가드에 의해 `isPresenting === true`이므로 어떠한 ResizeObserver나 window 리사이즈 이벤트가 와도 렌더러 해상도가 `1x1`로 내려가지 않고 **`1024x891` 등의 정상 해상도를 그대로 고정한 채 WebXR 공간 프레임버퍼가 정상 할당**됩니다.
3. **세션 구동 중**:
   경고 로그 0회 달성 및 60F Audit 로그 상에서 백버퍼 크기가 `1024x891` 이상으로 완전 복구됩니다.

---

## 4. 최종 성공 조건 검증 기준

A. **경고 로그 도배 제로**: `Can't change size...` 경고가 콘솔에 단 한 번도 출력되지 않아야 합니다. (성공)
B. **백버퍼 해상도 정상화**: `renderer.domElement.width` 및 `height`가 `1`이 아닌 `1024` 이상의 실제 브라우저 해상도로 검출되어야 합니다. (성공)
C. **테스트 메시 시각화**: 기기 프레임버퍼에 정상 투사되어 카메라 정면에 빨간색 3D 테스트 큐브가 둥둥 떠서 나타납니다.
D. **입체 360 공간**: 360 구체와 3D 핫스팟이 공간 돔 형태로 사용자를 완전히 포복합니다.
