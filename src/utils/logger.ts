// Note 1: 핫스팟 링크 클릭 동작 테스트 등 개발 로그를 일관되게 규격화하여 콘솔에 로깅하는 유틸리티입니다.
export const logger = {
  logHotspotTest(
    currentSceneId: string,
    hotspotLabel: string,
    targetSceneId: string,
    isSuccess: boolean
  ): void {
    console.log(
      `[Hotspot Test]\nCurrent Scene:\n${currentSceneId}\nClicked Hotspot:\n${hotspotLabel}\nTarget Scene:\n${targetSceneId}\nNavigation:\n${
        isSuccess ? "SUCCESS" : "FAILED"
      }`
    );
  },

  info(message: string, ...optionalParams: any[]): void {
    console.log(`[KINTEX-VR INFO] ${message}`, ...optionalParams);
  },

  warn(message: string, ...optionalParams: any[]): void {
    console.warn(`[KINTEX-VR WARN] ${message}`, ...optionalParams);
  },

  error(message: string, error?: any): void {
    console.error(`[KINTEX-VR ERROR] ${message}`, error);
  }
};
