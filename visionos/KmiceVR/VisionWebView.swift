import SwiftUI
import WebKit

// Note 1: WKWebView를 SwiftUI 뷰 계층에 통합하기 위해 UIViewRepresentable 프로토콜을 구현합니다.
struct VisionWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        
        // Note 2: WebXR 및 미디어 요소들이 사용자 별도 제스처 없이도 인라인 재생되도록 허용합니다.
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        
        // 스크롤 영역 피팅 및 불필요한 바운스 제거
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

        // Note 3: WebXR 세션 진입 등 모든 탐색(Navigation) 액션을 명시적으로 승인합니다.
        func webView(_ webView: WKWebView, 
                     decidePolicyFor navigationAction: WKNavigationAction, 
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        // Note 4: 카메라/마이크 등 센서 정보 접근 요청이 웹앱 측으로부터 들어올 때 자동으로 허용(Grant) 처리합니다.
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestMediaCaptureStateFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKMediaCaptureState) -> Void) {
            decisionHandler(.grant)
        }
    }
}
