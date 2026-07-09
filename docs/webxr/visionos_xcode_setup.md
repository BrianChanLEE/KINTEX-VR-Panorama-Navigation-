# VisionOS Swift & Xcode WebView Project Setup Guide

이 가이드는 Apple Vision Pro(VisionOS)에서 기존 React Three.js 웹 앱을 네이티브 WebView 앱으로 띄우고 WebXR Immersive Space 진입을 연동하기 위한 Xcode 프로젝트 설정 및 Swift 소스 코드 구성 안내서입니다.

---

## 1. Xcode 프로젝트 기본 설정

1. **Xcode 실행**: Xcode를 열고 **Create New Project...**를 선택합니다.
2. **템플릿 선택**: **visionOS** 탭에서 **App**을 선택합니다.
3. **프로젝트 설정**:
   * **Product Name**: `KmiceVR`
   * **Organization Identifier**: `com.example`
   * **Interface**: `SwiftUI`
   * **Immersive Space Render Loop**: `None` (기본 WebView UI에서 WebXR 세션이 직접 컨트롤하므로 SwiftUI Render Loop는 필요하지 않음)
   * **Preferred Default Scene**: `Window`

---

## 2. 파일 구조 (Recommended Structure)

Xcode 프로젝트에 아래 파일들을 추가하고 구성합니다.

```
KmiceVR/
├── KmiceVRApp.swift         # 앱 진입점
├── ContentView.swift        # 메인 Window UI (WebView 로드)
└── VisionWebView.swift      # WKWebView SwiftUI 래퍼
```

---

## 3. Swift 소스 코드 작성

### A. `VisionWebView.swift`
visionOS의 `WKWebView`에서 WebXR을 매끄럽게 연동하고, 미디어 자동 재생 권한 및 제스처를 허용하기 위해 아래와 같이 구성합니다.

```swift
import SwiftUI
import WebKit

struct VisionWebView: UIViewRepresentable {
    // 로컬 개발 서버 또는 배포된 웹 앱 URL
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        
        // WebXR 및 미디어 연동을 위한 필수 설정들
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // WebXR 지원을 위해 웹 뷰의 Preference 설정 조정
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences
        
        // WebView 생성
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        
        // 바운스 효과 제거 (웹앱이 화면에 꽉 차도록 설정)
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = false
        
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        uiView.load(request)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: VisionWebView

        init(_ parent: VisionWebView) {
            self.parent = parent
        }

        // WebXR 세션이나 카메라/마이크 등 장치 권한 요청 시 자동 수락 처리 (VisionOS 하이브리드 연동 핵심)
        func webView(_ webView: WKWebView, 
                     decidePolicyFor navigationAction: WKNavigationAction, 
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestMediaCaptureStateFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKMediaCaptureState) -> Void) {
            // 카메라 또는 오디오 센서 권한 자동 허용
            decisionHandler(.grant)
        }
    }
}
```

### B. `ContentView.swift`
웹앱 화면을 전체화면 크기로 보여줄 메인 뷰입니다.

```swift
import SwiftUI

struct ContentView: View {
    // 로컬 Vite 개발 서버 주소 또는 Netlify/Vercel 호스팅 주소 입력
    // TIP: 로컬 시뮬레이터에서 작동 확인 시 mac의 로컬 IP를 사용해야 정상 접속됩니다.
    @State private var webAppURL: URL = URL(string: "http://192.168.45.128:5174")!

    var declineURL: String = ""

    var body: some View {
        VStack(spacing: 0) {
            VisionWebView(url: webAppURL)
                .ignoresSafeArea(.all)
        }
        .frame(minWidth: 1280, minHeight: 720) // 시뮬레이터 기본 윈도우 크기 정의
    }
}
```

### C. `KmiceVRApp.swift`
앱 시작 시 메인 윈도우 씬을 생성합니다.

```swift
import SwiftUI

@main
struct KmiceVRApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.plain) // 시스템 타이틀 바 숨김 및 투명 디자인 가능
    }
}
```

---

## 4. Xcode `Info.plist` 권한 설정

Vision Pro의 공간 센서 및 손 추적(Hand Tracking) 데이터를 WebXR 세션에서 안전하게 접근할 수 있도록 Xcode 프로젝트의 `Info.plist` 파일에 아래 키(Key)와 설명을 추가합니다.

```xml
<key>NSCameraUsageDescription</key>
<string>웹 화면의 WebXR 공간 컴퓨팅 센서 렌더링을 위해 카메라 접근 권한이 필요합니다.</string>
<key>NSMotionUsageDescription</key>
<string>기기 자이로 센서를 매핑하여 360 공간 각도 연동을 위해 센서 권한이 필요합니다.</string>
<key>NSHandsTrackingUsageDescription</key>
<string>WebXR 공간 상호작용 제스처(집기 동작 등)를 핸드트래킹 센서 정보와 연결하기 위해 권한이 필요합니다.</string>
```

---

## 5. WebXR 실행을 위한 기기 설정 및 테스트 가이드

### A. 시뮬레이터 WebXR 개발자 기능 활성화 (필수)
visionOS WebView 및 Safari는 기본값으로 WebXR 기능 플래그가 비활성화되어 있는 경우가 많습니다. 아래 설정을 활성화해야 합니다.

1. **시뮬레이터 내 설정 실행**: Apple Vision Pro 시뮬레이터 안의 **Settings(설정)** 앱으로 이동합니다.
2. **사파리 설정 진입**: **Apps** -> **Safari** -> 하단의 **Advanced(고급)** 메뉴를 탭합니다.
3. **플래그 토글 활성화**: **Feature Flags** 항목에서 아래 플래그들을 활성화합니다:
   * `WebXR Device API` -> **Enabled**
   * `WebXR Hand Input Mode` -> **Enabled**

### B. 빌드 및 연동 실행 방법
1. **Target 설정**: Xcode 상단에서 **Simulator (Apple Vision Pro)**를 선택합니다.
2. **실행**: `Cmd + R`을 눌러 프로젝트를 빌드하고 시뮬레이터를 켭니다.
3. **웹 서버 기동**: 기존 React 프로젝트를 `bun run dev --host 0.0.0.0` 또는 `npm run dev --host` 명령어로 백그라운드 구동합니다.
4. **URL 동기화**: `ContentView.swift`의 `webAppURL`에 Mac 컴퓨터의 IP와 포트 번호를 지정하여 연동을 확인합니다.
