import SwiftUI

// Note 1: Apple Vision Pro 하이브리드 앱의 메인 엔트리포인트 선언입니다.
@main
struct KmiceVRApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        // 시스템 타이틀 바 등 불필요한 장식 데코레이션을 제거하고 플레인 윈도우 스타일로 출력합니다.
        .windowStyle(.plain)
    }
}
