import SwiftUI

// Note 1: 메인 윈도우 UI 영역으로서, WebXR 웹앱이 실행되고 있는 Mac 로컬 서버 URL을 웹뷰에 넘겨 로드합니다.
struct ContentView: View {
    // 360 VR 웹앱 서버 바인딩 주소
    @State private var webAppURL: URL = URL(string: "http://192.168.45.128:5174")!

    var body: some View {
        VStack(spacing: 0) {
            VisionWebView(url: webAppURL)
                .ignoresSafeArea(.all)
        }
        // Apple Vision Pro 시뮬레이터 표준 해상도 크기 설정
        .frame(minWidth: 1280, minHeight: 720)
    }
}
