# Apple Vision Pro (WebXR) Immersive VR 사용자 및 기술 설명서

본 문서는 Apple Vision Pro(visionOS) 환경에서 360도 파노라마 뷰 및 가상 핫스팟 공간 상호작용을 네이티브 WebXR로 즐기기 위한 기능 상세 설명 및 사용설명서입니다.

---

## 1. 기능 상세 설명 (Technical Overview)

본 기능은 기존 2D 모니터 및 모바일 터치 드래그 기반의 360도 뷰어를 넘어서, **Apple Vision Pro의 spatial 컴퓨팅 환경에서 몰입형(Immersive) 3D 가상 현실(VR)로 작동하게 하는 네이티브 연동 기술**입니다.

### 핵심 작동 원리
- **WebXR Device API**: 사파리(Safari) 브라우저에서 제공하는 WebXR API를 활용하여, 웹 캔버스를 Vision Pro 내의 가상 3D 공간 스페이스(`immersive-vr` 세션)로 즉시 바인딩하여 좌우 2안(Stereo) 렌더링을 처리합니다.
- **헤드 트래킹(Head Tracking)**: Vision Pro의 센서를 통해 머리의 회전 각도를 6자유도(6DoF)로 감지하고, Three.js의 XR 카메라(ArrayCamera) 위치를 실시간 보정하여 실제로 그 공간의 중심에 서 있는 듯한 360도 시각 효과를 줍니다.

---

## 2. 3D Sprite 변환 매커니즘 (3D Hotspot Sprite)

웹 2D 화면에서는 absolute position HTML 엘리먼트를 사용해 마커를 표시하지만, WebXR 몰입 모드에 돌입하면 모든 DOM 레이어가 가려집니다. 이를 극복하기 위해 **구형 좌표 데이터를 Three.js 3D 공간 상에 직접 투영하는 3D Sprite 시스템**을 구축했습니다.

### 좌표 변환 로직
1. **구형(Spherical) 좌표 추출**: 각 핫스팟의 방위각(`lon`)과 고도각(`lat`) 데이터를 로드합니다.
2. **삼각함수 기반 3D 벡터화**:
   - $\phi$ (Phi - 고도각 라디안 변환): $90^\circ - lat$
   - $\theta$ (Theta - 방위각 라디안 변환): $lon$
   - 이를 통하여 카메라를 원점(0, 0, 0)으로 하는 3D 월드 구면 상의 정밀한 방향 벡터를 연산합니다:
     $$x = -R \cdot \sin(\phi) \cdot \sin(\theta)$$
     $$y = R \cdot \cos(\phi)$$
     $$z = -R \cdot \sin(\phi) \cdot \cos(\theta)$$
     *(여기서 반경 $R$은 뷰어 내 구(Sphere) 크기보다 약간 안쪽인 350 지점으로 조절하여 최적의 입체감과 UI 가독성을 구현했습니다.)*
3. **THREE.Sprite 빌보드 렌더링**:
   - `THREE.Sprite`는 카메라가 어느 각도로 회전하든 항상 핫스팟의 이미지가 사용자를 정면으로 마주보도록 유지하는 빌보드(Billboard) 특징을 지닙니다.
   - 핫스팟의 종류(이동 마커, 정보 안내 마커)에 따른 커스텀 이미지 파일 경로(`url`)를 텍스처(`THREE.TextureLoader`)로 실시간 비동기 바인딩하여 렌더링합니다.

---

## 3. 시선(Gaze) 및 핀치(Pinch) 제스처 레이캐스팅 (Raycasting)

Apple Vision Pro는 하드웨어 컨트롤러 없이 **사용자의 시선(눈동자 위치)과 손가락을 가볍게 맞잡는 핀치(Pinch) 제스처**를 메인 입력 수단으로 채택하고 있습니다.

### 입력 감지 및 레이캐스터 작동 방식
1. **WebXR Input Source 바인딩**:
   - WebXR 스펙 내에서 비전프로의 시선 포인트와 손동작은 임시 입력 기기(Transient Input Source) 형태로 맵핑됩니다.
   - Three.js WebXRManager의 컨트롤러 인스턴스(`renderer.xr.getController(0)`, `(1)`)를 통해 기기 입력 이벤트를 감지합니다.
2. **Raycasting 구현**:
   - 사용자가 대상을 바라보고 핀치를 탭(`selectstart` 이벤트)하는 순간, 입력 위치(`controller.matrixWorld`)에서 레이(광선)의 원점과 가리키는 벡터 방향을 도출합니다.
   - `THREE.Raycaster` 객체가 해당 벡터의 직선 궤적 상에 위치한 `xrHotspotsGroup` 내부의 3D Sprite 메쉬들과 교차 검사(Intersection)를 매 프레임 병렬 수행합니다.
3. **씬 이동 트리거**:
   - 교차 검출 리스트 중 가장 맨 앞에 잡힌 Sprite 마커의 메타데이터(`userData.hotspot`)를 분석하여, 대상 씬의 ID(`hotspot.target`)로 `handleHotspotClick` 핸들러를 트리거하고 360도 파노라마 씬을 끊김 없이 순간이동시킵니다.

---

## 4. 사용 설명서 (User & Setup Guide)

### [1] 사전 준비사항 (HTTPS 필수)
- **보안 접속 환경 구축**: WebXR API는 보안 정책상 **HTTPS 프로토콜** 혹은 **localhost** 환경에서만 작동이 승인됩니다.
- **Vite 서버 터널링 혹은 인증서 적용**:
  - 로컬 네트워크 환경에서 Vision Pro로 사이트에 테스트 접속하려면 Vite 개발 환경에 self-signed SSL 인증서(`vite-plugin-mkcert` 등)를 세팅하여 `https://<로컬IP>:5173` 형태로 접근하도록 하거나, ngrok/localtonet 등의 터널링 도구를 통해 HTTPS 주소로 포워딩해야 기기가 WebXR 기능을 수락합니다.

### [2] VR 세션 진입 및 기기 조작법
1. **사이트 접속**: Apple Vision Pro 내부의 Safari 브라우저를 켜고 개발 호스팅 주소(HTTPS)로 진입합니다.
2. **VR 모드 켜기**:
   - 메인 화면 우측 하단의 나침반 미니맵 바로 아래에 위치한 **[VR 보기]** 버튼을 시선으로 응시하고 검지-엄지 핀치로 선택합니다.
   - "이 웹사이트가 공간 정보를 공유하려 합니다" 권한 팝업창이 나타나면 **[허용/수락]**을 탭합니다.
3. **가상 현실 감상**:
   - 주변 웹 브라우저 창이 완전히 사라지고, 고개를 전후좌우로 돌리는 방향에 맞춰 360도 입체 파노라마 경관이 눈앞에 가득 차게 됩니다.
4. **핫스팟 조작 및 이동**:
   - 공간 상에 공중에 떠 있는 핫스팟 아이콘 마커(화살표 마커, 비상구 마커 등)를 바라봅니다.
   - 핫스팟 위에 조준점이 맞춰진 상태에서 검지와 엄지를 가볍게 맞잡아 **핀치 탭**하면, 해당 구역(예: 1층 로비 내부)으로 즉시 순간이동하며 시점이 전환됩니다.
5. **VR 모드 종료**:
   - Vision Pro 기기 상단 좌측의 크라운 다이얼(디지털 크라운)을 누르거나, 세션 화면 하단에 가상으로 활성화되는 시스템 브라우저 `[Exit VR]` 버튼을 누르면 평소의 2D 평면 웹 브라우저 모드로 안전하게 복귀합니다.
