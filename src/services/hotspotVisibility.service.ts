import type { Hotspot } from "../models/hotspot.model";
import { hotspotService } from "./hotspot.service";

export type HotspotVisibilityTab = string | null | undefined;

const isDimHotspot = (hotspot: Hotspot) => hotspot.url?.includes("dim-img");
const isExplicitNavigationCategory = (category?: string) => category === "navigation";
const isInformationCategory = (category?: string) =>
  category === "general" || category === "safety" || category === "space";

export const isNavigationHotspot = (hotspot: Hotspot): boolean => {
  return isExplicitNavigationCategory(hotspot.category) || hotspot.kind === "nav" || hotspot.type === "navigation" || Boolean(hotspot.target);
};

export const shouldShowDesktopHotspot = (
  hotspot: Hotspot,
  showHotspots: boolean,
  activeTab: HotspotVisibilityTab,
): boolean => {
  if (isDimHotspot(hotspot)) {
    return false;
  }

  if (isNavigationHotspot(hotspot)) {
    return true;
  }

  if (!showHotspots) {
    return false;
  }

  if (isInformationCategory(hotspot.category)) {
    if (activeTab == null) {
      return false;
    }
    return hotspot.category === activeTab;
  }

  const isSafetyTabActive = activeTab === "safety";

  if (isSafetyTabActive) {
    return true;
  }

  if (hotspotService.isSafetyHotspot(hotspot.url)) {
    return false;
  }

  return true;
};

export const filterDesktopHotspots = (
  hotspots: Hotspot[],
  showHotspots: boolean,
  activeTab: HotspotVisibilityTab,
): Hotspot[] => {
  return hotspots.filter((hotspot) => shouldShowDesktopHotspot(hotspot, showHotspots, activeTab));
};
