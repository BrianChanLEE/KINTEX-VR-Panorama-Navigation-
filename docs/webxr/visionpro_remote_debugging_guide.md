# Apple Vision Pro Safari Remote Debugging Guide

비전프로 Safari 내부에서 발생하는 `console.log` 및 자바스크립트 런타임 에러를 실시간으로 확인하고 제어하기 위한 원격 디버깅 가이드라인입니다.

---

## 방법 1. Mac Safari Web Inspector 연동 (가장 추천 - 정석)

맥(Mac) 노트북/데스크톱의 Safari 개발자 도구를 활용하여 비전프로 화면의 웹 세션을 원격으로 들여다보는 방식입니다. 별도의 코드 수정 없이 콘솔, 네트워크, WebGL 성능 분석이 가능합니다.

### [1] Apple Vision Pro 설정
1. 비전프로 홈 스페이스에서 **설정 (Settings)** 앱을 엽니다.
2. 왼쪽 메뉴에서 **Safari**를 선택합니다.
3. Safari 설정 최하단에 있는 **고급 (Advanced)** 메뉴로 들어갑니다.
4. **웹 검사기 (Web Inspector)** 옵션을 **활성화 (ON)** 합니다.

### [2] Mac 컴퓨터 설정 (Safari 17+ 최신 버전 기준)
1. Mac에서 **Safari** 브라우저를 엽니다.
2. Safari 상단 메뉴 바에서 **Safari** ➔ **설정 (Settings/Preferences)** 메뉴로 이동합니다.
3. **고급 (Advanced)** 탭으로 이동합니다.
4. 고급 탭의 맨 아래에 있는 **"웹 개발자를 위한 기능 보기" (Show features for web developers)** 체크박스를 체크하여 활성화합니다.
5. 활성화하면 Safari 상단 메뉴 바에 **개발자용 (Develop)** 메뉴가 새로 나타납니다.

### [3] 원격 디버깅 시작
1. Mac과 Apple Vision Pro가 **동일한 Wi-Fi 네트워크**에 연결되어 있는지 확인합니다.
2. 비전프로 Safari에서 테스트하려는 전시장 웹 페이지(localhost 또는 개발서버 IP)를 엽니다.
3. Mac Safari 상단 메뉴 바의 **개발자용 (Develop)** ➔ **Apple Vision Pro [기기명]**을 마우스로 가리킵니다.
4. 서브메뉴에 노출되는 현재 웹사이트 페이지를 클릭하면 Mac 화면에 **웹 검사기(개발자 도구)** 창이 생성됩니다.
5. 이제 Mac 개발자 도구의 **콘솔 (Console)** 탭에서 비전프로 기기 내부에서 발생하는 로그와 에러를 실시간으로 모니터링할 수 있습니다.

---

## 방법 2. On-Screen Virtual Console 로거 주입 (차선책 - 간이식)

동일 네트워크에 맥북이 없거나 연동이 번거로운 경우, 화면 하단이나 플로팅 윈도우 형태로 개발 로그를 덮어 씌우는 자바스크립트 로거 라이브러리(`eruda` 또는 `vConsole`)를 빌드에 주입하여 비전프로 화면 내에서 바로 로그를 띄우는 방식입니다.

### [1] vite.config.ts 또는 index.html에 CDN 주입
Vite 개발 모드일 때만 비전프로 화면 우측 하단에 기어(설정) 아이콘 형태의 개발자 도구를 띄우는 코드입니다.

- `index.html` 의 `<head>` 영역에 아래 스크립트 주입:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
  <script>eruda.init();</script>
  ```
  이러면 비전프로 사파리 웹 화면 우측 하단에 투명한 반원/기어 모양 아이콘이 생성되며, 이를 손가락으로 탭하면 기기 내에 가상 콘솔 창이 열려 로그를 직관적으로 볼 수 있습니다.

---

## 방법 3. Three.js 3D Spatial VR HUD HUD 구현 (최종안)

WebXR `immersive-vr` 상태 안으로 진입하게 되면 HTML DOM 엘리먼트들이 시야에서 완전히 사라지게 됩니다. 따라서 몰입형 3D 월드 내부에서 발생하는 세션 에러를 추적하려면, 사용자의 코 앞 가상 카메라 시점 아래에 따라다니는 **3D 텍스트 메쉬 디버거**를 생성하여 `console.log` 배열을 뿌리는 구조가 필요합니다.
이 HUD 디버거 코드는 개발 테스트 단계에 유용합니다.
