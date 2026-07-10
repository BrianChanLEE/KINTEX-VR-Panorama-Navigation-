import { useCallback, useEffect } from "react";
import { panoramaTextureCacheService } from "../services/panoramaTextureCache.service";

// Note 1: Panorama texture controller 는 서비스와 뷰 사이에서 캐시 정책 실행만 담당합니다.
// Note 2: 뷰는 "무엇을 보여줄지"만 알고, 캐시의 순서와 수명은 이 컨트롤러가 관리합니다.

export function usePanoramaTextureController(sceneId: string) {
  // Note 3: 앱 시작 직후 네트워크 캐시를 채워서 첫 전환 시점의 대기 시간을 줄입니다.
  useEffect(() => {
    void panoramaTextureCacheService.primeBrowserCache();
  }, []);

  // Note 4: 현재 씬이 바뀔 때마다 주변 씬까지 함께 준비합니다.
  useEffect(() => {
    void panoramaTextureCacheService.prepareSceneWindow(sceneId);
  }, [sceneId]);

  const warmCurrentSceneWindow = useCallback((nextSceneId: string) => {
    void panoramaTextureCacheService.prepareSceneWindow(nextSceneId);
  }, []);

  const getTexture = useCallback((rawUrl: string) => {
    return panoramaTextureCacheService.getTexture(rawUrl);
  }, []);

  const releaseColdTextures = useCallback((nextSceneId: string) => {
    panoramaTextureCacheService.releaseColdTextures(nextSceneId);
  }, []);

  return {
    getTexture,
    warmCurrentSceneWindow,
    releaseColdTextures,
  };
}
