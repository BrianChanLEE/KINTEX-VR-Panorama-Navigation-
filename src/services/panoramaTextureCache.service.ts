import * as THREE from "three";
import { SCENES } from "../models/scene.model";
import { resolveAssetPath } from "../utils/assetPath";

// Note 1: 파노라마 텍스처 캐시는 "다운로드"와 "GPU 업로드"를 분리해서 관리합니다.
// Note 2: 브라우저 캐시에는 모든 파노라마 원본을 미리 넣고, GPU 메모리에는 현재 윈도우만 상주시킵니다.

type PanoramaTextureKey = string;

interface PanoramaTextureEntry {
  url: string;
  browserPrefetchPromise?: Promise<void>;
  texturePromise?: Promise<THREE.Texture>;
  texture?: THREE.Texture;
  lastUsedAt: number;
}

const panoramaTextureCache = new Map<PanoramaTextureKey, PanoramaTextureEntry>();
const texturePrefetchWindowRadius = 2;
const browserPrefetchChunkSize = 4;
const browserPrefetchDelayMs = 0;

function resolveTextureKey(rawUrl: string) {
  return resolveAssetPath(rawUrl);
}

function getOrCreateEntry(rawUrl: string): PanoramaTextureEntry {
  const key = resolveTextureKey(rawUrl);
  const existing = panoramaTextureCache.get(key);
  if (existing) {
    return existing;
  }

  const created: PanoramaTextureEntry = {
    url: key,
    lastUsedAt: 0,
  };
  panoramaTextureCache.set(key, created);
  return created;
}

function fetchImageIntoBrowserCache(rawUrl: string) {
  const entry = getOrCreateEntry(rawUrl);
  if (entry.browserPrefetchPromise) {
    return entry.browserPrefetchPromise;
  }

  // Note 3: `Image` 객체는 네트워크 응답과 디코드 준비를 브라우저 캐시에 남기는 역할을 합니다.
  entry.browserPrefetchPromise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to prefetch panorama: ${entry.url}`));
    image.src = entry.url;
  }).finally(() => {
    entry.browserPrefetchPromise = undefined;
  });

  return entry.browserPrefetchPromise;
}

async function createTextureFromImageSource(rawUrl: string) {
  const entry = getOrCreateEntry(rawUrl);
  entry.lastUsedAt = Date.now();

  if (entry.texture) {
    return entry.texture;
  }

  if (!entry.texturePromise) {
    entry.texturePromise = (async () => {
      // Note 4: 브라우저 캐시가 이미 채워져 있으면, 이미지 재요청 비용보다 디코드/업로드 비용이 주된 병목이 됩니다.
      const image = await loadImageElement(entry.url);
      const texture = new THREE.Texture(image);
      configurePanoramaTexture(texture);
      texture.needsUpdate = true;
      entry.texture = texture;
      return texture;
    })().finally(() => {
      entry.texturePromise = undefined;
    });
  }

  return entry.texturePromise;
}

function configurePanoramaTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}

function loadImageElement(rawUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "";
    image.onload = async () => {
      try {
        if (typeof image.decode === "function") {
          await image.decode();
        }
      } catch (error) {
        console.warn(`[PanoramaTextureCache] image.decode() failed for ${rawUrl}`, error);
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Failed to load panorama image: ${rawUrl}`));
    image.src = rawUrl;
  });
}

function getSceneWindow(sceneId: string, radius = texturePrefetchWindowRadius) {
  const index = SCENES.findIndex((scene) => scene.id === sceneId);
  if (index < 0) {
    return SCENES.slice(0, 1);
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(SCENES.length, index + radius + 1);
  return SCENES.slice(start, end);
}

function disposeColdTextures(keepUrls: Set<string>) {
  const candidates = Array.from(panoramaTextureCache.values())
    .filter((entry) => entry.texture && !keepUrls.has(entry.url))
    .sort((left, right) => left.lastUsedAt - right.lastUsedAt);

  // Note 5: LRU는 "오래 안 쓴 텍스처부터 제거"하는 단순 정책이라 예측 가능하고 디버깅이 쉽습니다.
  for (const entry of candidates) {
    if (keepUrls.has(entry.url) || !entry.texture) continue;
    entry.texture.dispose();
    entry.texture = undefined;
  }
}

function buildKeepSet(sceneId: string, radius = texturePrefetchWindowRadius) {
  return new Set(getSceneWindow(sceneId, radius).map((scene) => resolveTextureKey(scene.img)));
}

export const panoramaTextureCacheService = {
  // Note 6: 앱 시작 시 네트워크 캐시를 먼저 채워서 이후 decode/load 를 가볍게 만듭니다.
  async primeBrowserCache() {
    const urls = SCENES.map((scene) => scene.img);
    for (let index = 0; index < urls.length; index += browserPrefetchChunkSize) {
      const chunk = urls.slice(index, index + browserPrefetchChunkSize);
      await Promise.allSettled(chunk.map((url) => fetchImageIntoBrowserCache(url)));
      if (browserPrefetchDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, browserPrefetchDelayMs));
      }
    }
  },

  // Note 7: 현재 씬 주변만 GPU 상주시키고 나머지는 느슨하게 내립니다.
  async prepareSceneWindow(sceneId: string, options?: { disposeColdTextures?: boolean }) {
    const windowScenes = getSceneWindow(sceneId);
    await Promise.allSettled(windowScenes.map((scene) => createTextureFromImageSource(scene.img)));
    if (options?.disposeColdTextures === false) {
      return;
    }
    disposeColdTextures(buildKeepSet(sceneId));
  },

  async getTexture(rawUrl: string) {
    return createTextureFromImageSource(rawUrl);
  },

  touch(rawUrl: string) {
    const entry = panoramaTextureCache.get(resolveTextureKey(rawUrl));
    if (entry) {
      entry.lastUsedAt = Date.now();
    }
  },

  releaseColdTextures(sceneId: string) {
    disposeColdTextures(buildKeepSet(sceneId));
  },
};
