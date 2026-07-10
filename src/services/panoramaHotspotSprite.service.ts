import * as THREE from "three";
import { resolveAssetPath } from "../utils/assetPath";
import { getHotspotBadgeConfig, getHotspotBadgeDataUrl } from "../utils/hotspotBadge";
import type { Hotspot } from "../models/scene.model";

export interface PanoramaHotspotSpriteContext {
  sceneId: string;
  lang: "KOR" | "ENG";
  group: THREE.Group;
  renderer?: THREE.WebGLRenderer;
  hotspots: Hotspot[];
  overrides: Record<string, Record<string, { ath: number; atv: number }>>;
  showHotspots: boolean;
  activeTab?: string | null;
}

const isSafetyHotspot = (hotspot: Hotspot) =>
  hotspot.url?.includes("marker-fire") ||
  hotspot.url?.includes("marker-cctv") ||
  hotspot.url?.includes("marker-aed") ||
  hotspot.url?.includes("marker-safety") ||
  hotspot.url?.includes("marker-exit");

const isDimHotspot = (hotspot: Hotspot) => hotspot.url?.includes("dim-img");

const clearGroup = (group: THREE.Group) => {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);

    if (child instanceof THREE.Sprite) {
      child.geometry.dispose();

      const material = child.material;
      const materialMap = material instanceof THREE.SpriteMaterial ? material.map : null;
      materialMap?.dispose();
      material.dispose();
    }
  }
};

const createFallbackTexture = (label: string) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  const iconSize = 64;
  context.font = "bold 22px Arial, sans-serif";
  const textWidth = context.measureText(label).width;
  const canvasWidth = Math.max(iconSize, textWidth + 24);
  const canvasHeight = iconSize + 40;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  const centerX = canvasWidth / 2;
  const centerY = iconSize / 2;

  context.beginPath();
  context.arc(centerX, centerY, 26, 0, Math.PI * 2);
  context.fillStyle = "rgba(0,0,0,0.5)";
  context.fill();

  context.beginPath();
  context.arc(centerX, centerY, 22, 0, Math.PI * 2);
  context.fillStyle = "#ff007f";
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(centerX, centerY, 8, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();

  context.font = "bold 22px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.strokeStyle = "rgba(0, 0, 0, 0.9)";
  context.lineWidth = 4;
  context.strokeText(label, centerX, iconSize + 6);
  context.fillStyle = "#ffff00";
  context.fillText(label, centerX, iconSize + 6);

  return new THREE.CanvasTexture(canvas);
};

const createSprite = (
  group: THREE.Group,
  hotspot: Hotspot,
  ath: number,
  atv: number,
  texture: THREE.Texture,
  imageWidth: number,
  imageHeight: number,
  renderer?: THREE.WebGLRenderer,
) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  const sprite = new THREE.Sprite(material);
  const phi = THREE.MathUtils.degToRad(90 - atv);
  const theta = THREE.MathUtils.degToRad(ath);

  sprite.position.set(
    -300 * Math.sin(phi) * Math.sin(theta),
    300 * Math.cos(phi),
    -300 * Math.sin(phi) * Math.cos(theta),
  );

  const ratio = imageHeight > 0 ? imageWidth / imageHeight : 1;
  sprite.scale.set(32 * ratio, 32, 1);
  sprite.userData = { hotspot };
  sprite.renderOrder = 10;
  group.add(sprite);
};

export function rebuildPanoramaHotspotSprites({
  sceneId,
  lang,
  group,
  renderer,
  hotspots,
  overrides,
  showHotspots,
  activeTab,
}: PanoramaHotspotSpriteContext) {
  clearGroup(group);

  if (!showHotspots) {
    return () => {};
  }

  let cancelled = false;

  hotspots.forEach((hotspot) => {
    if (cancelled) return;
    if ((isSafetyHotspot(hotspot) && activeTab !== "safety") || isDimHotspot(hotspot)) {
      return;
    }

    const sceneOverrides = overrides[sceneId] || {};
    const override = sceneOverrides[hotspot.id || hotspot.label];
    const ath = override?.ath ?? hotspot.lon;
    const atv = override?.atv ?? hotspot.lat;
    const badgeConfig = getHotspotBadgeConfig(hotspot, lang);
    const imagePath = getHotspotBadgeDataUrl(badgeConfig);
    let usedFallback = false;

    const image = new Image();
    image.crossOrigin = "";

    image.onload = () => {
      if (cancelled) return;
      const texture = new THREE.Texture(image);
      texture.needsUpdate = true;
      createSprite(
        group,
        hotspot,
        ath,
        atv,
        texture,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        renderer,
      );
    };

    image.onerror = () => {
      if (cancelled) return;

      if (!usedFallback) {
        usedFallback = true;
        const fallbackConfig = getHotspotBadgeConfig(
          { ...hotspot, url: "/mice/upload/mice_vr/marker/marker01.png" },
          lang,
        );
        image.src = getHotspotBadgeDataUrl(fallbackConfig);
        return;
      }

      const fallbackTexture = createFallbackTexture(hotspot.label || "");
      if (!fallbackTexture) return;

      createSprite(
        group,
        hotspot,
        ath,
        atv,
        fallbackTexture,
        (fallbackTexture.image as HTMLCanvasElement | undefined)?.width || 1,
        (fallbackTexture.image as HTMLCanvasElement | undefined)?.height || 1,
        renderer,
      );
    };

    image.src = resolveAssetPath(imagePath);
  });

  return () => {
    cancelled = true;
  };
}
