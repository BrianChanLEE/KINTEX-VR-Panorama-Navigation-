import { resolveAssetPath } from "./assetPath";
import type { Hotspot } from "../models/scene.model";

export type HotspotLang = "KOR" | "ENG";

export interface HotspotBadgeConfig {
  label: string;
  iconUrl: string;
  width: number;
  height: number;
  iconSize: number;
  fontSize: number;
  renderScale: number;
}

const badgeCache = new Map<string, HotspotBadgeConfig>();
const svgUrlCache = new Map<string, string>();

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getHotspotDisplayText(hotspot: Hotspot, lang: HotspotLang) {
  return lang === "ENG" ? hotspot.labelEn || hotspot.label : hotspot.label;
}

export function getHotspotBadgeConfig(hotspot: Hotspot, lang: HotspotLang): HotspotBadgeConfig {
  const label = getHotspotDisplayText(hotspot, lang);
  const cacheKey = `${hotspot.url || ""}|${label}`;
  const cached = badgeCache.get(cacheKey);
  if (cached) return cached;

  const textLength = Array.from(label).length;
  const fontSize = 22;
  const iconSize = 72;
  const width = Math.max(144, Math.min(420, Math.round(84 + textLength * 12)));
  const height = 118;
  const renderScale = 4;
  const iconUrl = resolveAssetPath(hotspot.url || "/mice/upload/mice_vr/marker/nav.png");

  const config = { label, iconUrl, width, height, iconSize, fontSize, renderScale };
  badgeCache.set(cacheKey, config);
  return config;
}

export function buildHotspotBadgeSvg(config: HotspotBadgeConfig) {
  const iconX = Math.round((config.width - config.iconSize) / 2);
  const textY = config.iconSize + 24;
  const renderWidth = config.width * config.renderScale;
  const renderHeight = config.height * config.renderScale;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${renderWidth}" height="${renderHeight}" viewBox="0 0 ${config.width} ${config.height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35" />
        </filter>
      </defs>
      <image href="${escapeXml(config.iconUrl)}" xlink:href="${escapeXml(config.iconUrl)}" x="${iconX}" y="0" width="${config.iconSize}" height="${config.iconSize}" preserveAspectRatio="xMidYMid meet" />
      <text x="${Math.round(config.width / 2)}" y="${textY}" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${config.fontSize}" font-weight="700"
            fill="#ffffff" stroke="#000000" stroke-width="4" paint-order="stroke fill"
            filter="url(#shadow)">${escapeXml(config.label)}</text>
    </svg>
  `.trim();
}

export function getHotspotBadgeDataUrl(config: HotspotBadgeConfig) {
  const cacheKey = `${config.iconUrl}|${config.label}|${config.width}|${config.height}|${config.iconSize}|${config.fontSize}|${config.renderScale}`;
  const cached = svgUrlCache.get(cacheKey);
  if (cached) return cached;

  const svg = buildHotspotBadgeSvg(config);
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}
