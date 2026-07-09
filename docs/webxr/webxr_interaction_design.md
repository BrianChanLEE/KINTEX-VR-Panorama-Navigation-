# WebXR Gaze & Pinch Interaction Design (Vision Pro & Three.js)

Apple Vision Pro는 눈의 시선(Gaze)으로 타겟을 바라보고 손가락을 맞잡는 동작(Pinch)을 기본 입력 장치로 사용합니다. 이 디자인 문서는 Three.js의 WebXR 시스템을 활용해 이를 감지하고 3D 핫스팟(Portal)을 클릭하는 시뮬레이터 상호작용 설계 가이드입니다.

---

## 1. Vision Pro 입력 매핑 원리

WebXR 스펙 상 Apple Vision Pro의 시선 및 제스처 동작은 다음과 같이 매핑됩니다:

1. **시선(Gaze)**: 사용자가 바라보는 방향이 WebXR의 가상의 **입력 레이(Ray/Pointer)**가 됩니다.
2. **집기(Pinch)**: 손가락을 핀치하면 WebXR `select` 이벤트가 발생합니다.
   * `selectstart`: 핀치를 시작할 때
   * `select`: 핀치 후 손가락을 뗄 때 (일반적인 클릭 완료)
   * `selectend`: 핀치를 완전히 놓았을 때

Three.js에서는 `renderer.xr.getController(index)` 메서드를 사용해 이 입력 레이를 가져오고 인터랙션을 처리할 수 있습니다.

---

## 2. Three.js 구현 코드 구조

아래는 웹앱에 탑재할 Three.js WebXR 컨트롤러 및 레이캐스터 연동 예제 코드입니다.

### A. 컨트롤러 및 Raycaster 설정

```javascript
import * as THREE from 'three';

// 1. Raycaster 및 가상의 레이 표시선(선택 사항) 생성
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// 2. XR 컨트롤러 객체 가져오기 (0번은 주 시선/포인터 역할)
const controller = renderer.xr.getController(0);

// 3. 핀치 제스처(Select) 이벤트 리스너 바인딩
controller.addEventListener('selectstart', onSelectStart);
controller.addEventListener('selectend', onSelectEnd);
controller.addEventListener('select', onSelect);
scene.add(controller);
```

### B. 핫스팟 탐지 및 Hover 상태 변경 (애니메이션 루프 내 실행)

시뮬레이터나 Vision Pro 실기기에서는 매 프레임마다 사용자가 바라보는 방향(Gaze)에 핫스팟이 위치하는지 계산하여, 핫스팟이 살짝 커지거나 밝아지는 등의 **시각 피드백(Hover)**을 주어야 자연스럽습니다.

```javascript
function cleanIntersected() {
  // 이전 프레임에서 포커싱된 핫스팟 원래 상태로 복구
  if (intersectedObject) {
    intersectedObject.scale.set(1, 1, 1); // 크기 리셋
    intersectedObject = null;
  }
}

// Three.js Render Loop 내에서 매 프레임 호출
function updateXRInteraction() {
  if (!renderer.xr.isPresenting) return;

  cleanIntersected();

  // 컨트롤러(시선 레이)의 방향 정보 획득
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  // hotspots 그룹 내부의 객체들과 교차 검사
  const intersects = raycaster.intersectObjects(hotspots.children, true);

  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    
    // 시선이 핫스팟에 닿았을 때 피드백 제공 (Hover 효과)
    hitObject.scale.set(1.15, 1.15, 1.15); // 15% 확대
    intersectedObject = hitObject;
  }
}
```

### C. 핀치 클릭(Select) 시 포탈 이동 처리

```javascript
function onSelect() {
  if (intersectedObject) {
    // 시선이 머무른 상태에서 핀치했을 때 실제 이동 로직 트리거
    const targetSceneId = intersectedObject.userData.targetSceneId;
    if (targetSceneId) {
      changeScene(targetSceneId); // 파노라마 씬 전환 함수 호출
    }
  }
}
```

---

## 3. 기획적 권장사항 (Best Practices)

1. **지시 링(Reticle) 또는 빔 제거**:
   * Vision Pro는 기본적으로 시선 포인터를 화면에 직접 레이저 빔 형태로 그리는 것을 권장하지 않습니다 (자연스럽지 않기 때문).
   * 대신 **바라보는 대상(핫스팟)** 자체가 스스로 밝아지거나, 약간 크기가 커지거나, UI의 보더가 생기는 방식을 사용하십시오.
2. **충분한 히트 영역 (Hit Box)**:
   * 손가락 제스처 및 시선이 완전히 정밀하지 않을 수 있으므로 핫스팟의 물리적 콜라이더(Mesh) 영역은 시각적인 영역보다 약간 더 크게 설정하는 것이 조작성을 획기적으로 개선합니다.
