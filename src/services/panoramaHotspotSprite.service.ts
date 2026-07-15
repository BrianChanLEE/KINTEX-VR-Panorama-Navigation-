import * as THREE from "three";
import { resolveAssetPath } from "../utils/assetPath";
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

const DEFAULT_MARKER_URL = "/mice/upload/mice_vr/marker/nav.png";
const SPRITE_ICON_SIZE = 72;
const SPRITE_LABEL_FONT_SIZE = 11;
const SPRITE_LABEL_MAX_WIDTH = 220;
const SPRITE_TEXTURE_RATIO = 2;

const getSpriteImageUrl = (hotspot: Hotspot) =>
  resolveAssetPath(hotspot.url || DEFAULT_MARKER_URL);

const getHotspotLabel = (hotspot: Hotspot, lang: "KOR" | "ENG") =>
  lang === "KOR" ? hotspot.label : hotspot.labelEn || hotspot.label;

const fitText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let next = text;
  while (next.length > 1 && context.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }

  return `${next}…`;
};

const createHotspotSpriteTexture = (
  image: HTMLImageElement,
  label: string,
) => {
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) return null;

  measureContext.font = `600 ${SPRITE_LABEL_FONT_SIZE * SPRITE_TEXTURE_RATIO}px Arial, sans-serif`;
  const labelText = fitText(
    measureContext,
    label,
    SPRITE_LABEL_MAX_WIDTH * SPRITE_TEXTURE_RATIO,
  );
  const measuredLabelWidth = measureContext.measureText(labelText).width / SPRITE_TEXTURE_RATIO;
  const labelWidth = Math.min(SPRITE_LABEL_MAX_WIDTH, Math.max(48, measuredLabelWidth + 16));
  const canvasWidth = Math.ceil(Math.max(SPRITE_ICON_SIZE, labelWidth));
  const canvasHeight = 96;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * SPRITE_TEXTURE_RATIO;
  canvas.height = canvasHeight * SPRITE_TEXTURE_RATIO;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(SPRITE_TEXTURE_RATIO, SPRITE_TEXTURE_RATIO);
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  const imageRatio = imageWidth / imageHeight;
  const drawWidth = imageRatio >= 1 ? SPRITE_ICON_SIZE : SPRITE_ICON_SIZE * imageRatio;
  const drawHeight = imageRatio >= 1 ? SPRITE_ICON_SIZE / imageRatio : SPRITE_ICON_SIZE;
  const iconX = (canvasWidth - drawWidth) / 2;

  context.shadowColor = "rgba(0, 0, 0, 0.3)";
  context.shadowBlur = 4;
  context.shadowOffsetY = 2;
  context.drawImage(image, iconX, 0, drawWidth, drawHeight);
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  const labelX = (canvasWidth - labelWidth) / 2;
  const labelY = SPRITE_ICON_SIZE + 5;
  const labelHeight = 19;
  const radius = 4;

  context.beginPath();
  context.roundRect(labelX, labelY, labelWidth, labelHeight, radius);
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.fill();

  context.font = `600 ${SPRITE_LABEL_FONT_SIZE}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255, 255, 255, 0.95)";
  context.fillText(labelText, canvasWidth / 2, labelY + labelHeight / 2);

  return {
    texture: new THREE.CanvasTexture(canvas),
    width: canvasWidth,
    height: canvasHeight,
  };
};

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
  const isXrPresenting = Boolean(renderer?.xr.isPresenting);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: !isXrPresenting,
  });
  material.toneMapped = false;

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
  sprite.frustumCulled = false;
  sprite.renderOrder = isXrPresenting ? 9999 : 10;
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

  if (!showHotspots && activeTab !== "safety") {
    return () => { };
  }

  let cancelled = false;
  group.renderOrder = 9999;

  hotspots.forEach((hotspot) => {
    if (cancelled) return;
    if (isDimHotspot(hotspot)) {
      return;
    }
    if (activeTab !== "safety" && isSafetyHotspot(hotspot)) {
      return;
    }

    const sceneOverrides = overrides[sceneId] || {};
    const override = sceneOverrides[hotspot.id || hotspot.label];
    const ath = override?.ath ?? hotspot.lon;
    const atv = override?.atv ?? hotspot.lat;
    const imagePath = getSpriteImageUrl(hotspot);
    let usedFallback = false;

    const image = new Image();
    image.crossOrigin = "";

    image.onload = () => {
      if (cancelled) return;
      const spriteTexture = createHotspotSpriteTexture(
        image,
        getHotspotLabel(hotspot, lang),
      );
      const texture = spriteTexture?.texture || new THREE.Texture(image);
      texture.needsUpdate = true;
      createSprite(
        group,
        hotspot,
        ath,
        atv,
        texture,
        spriteTexture?.width || image.naturalWidth || image.width,
        spriteTexture?.height || image.naturalHeight || image.height,
        renderer,
      );
    };

    image.onerror = () => {
      if (cancelled) return;

      if (!usedFallback) {
        usedFallback = true;
        image.src = resolveAssetPath(DEFAULT_MARKER_URL);
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

    image.src = imagePath;
  });

  return () => {
    cancelled = true;
  };
}
