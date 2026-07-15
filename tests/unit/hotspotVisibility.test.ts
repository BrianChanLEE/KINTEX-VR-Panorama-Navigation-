import { describe, expect, it } from "bun:test";
import type { Hotspot } from "../../src/models/hotspot.model";
import {
  filterDesktopHotspots,
  isNavigationHotspot,
  shouldShowDesktopHotspot,
} from "../../src/services/hotspotVisibility.service";

const navigationHotspot: Hotspot = {
  id: "nav-1",
  lon: 0,
  lat: 0,
  label: "다음 씬",
  labelEn: "Next Scene",
  kind: "nav",
  target: "scene_2668",
  url: "/mice/upload/mice_vr/marker/nav.png",
};

const generalHotspot: Hotspot = {
  id: "general-1",
  lon: 0,
  lat: 0,
  label: "일반",
  labelEn: "General",
  kind: "poi",
  category: "general",
};

const safetyHotspot: Hotspot = {
  id: "safety-1",
  lon: 0,
  lat: 0,
  label: "안전",
  labelEn: "Safety",
  kind: "poi",
  category: "safety",
  url: "/mice/upload/mice_vr/marker/marker-fire-ex.png",
};

const spaceHotspot: Hotspot = {
  id: "space-1",
  lon: 0,
  lat: 0,
  label: "공간",
  labelEn: "Space",
  kind: "poi",
  category: "space",
};

describe("hotspot filtering", () => {
  it("always includes navigation hotspots", () => {
    expect(isNavigationHotspot(navigationHotspot)).toBe(true);
    expect(shouldShowDesktopHotspot(navigationHotspot, true, null)).toBe(true);
    expect(shouldShowDesktopHotspot(navigationHotspot, false, "general")).toBe(true);
  });

  it("filters general hotspots by active tab", () => {
    expect(shouldShowDesktopHotspot(generalHotspot, true, "general")).toBe(true);
    expect(shouldShowDesktopHotspot(generalHotspot, true, "safety")).toBe(false);
    expect(shouldShowDesktopHotspot(generalHotspot, true, "space")).toBe(false);
  });

  it("filters safety hotspots by active tab", () => {
    expect(shouldShowDesktopHotspot(safetyHotspot, true, "safety")).toBe(true);
    expect(shouldShowDesktopHotspot(safetyHotspot, true, "general")).toBe(false);
    expect(shouldShowDesktopHotspot(safetyHotspot, true, "space")).toBe(false);
  });

  it("filters space hotspots by active tab", () => {
    expect(shouldShowDesktopHotspot(spaceHotspot, true, "space")).toBe(true);
    expect(shouldShowDesktopHotspot(spaceHotspot, true, "general")).toBe(false);
    expect(shouldShowDesktopHotspot(spaceHotspot, true, "safety")).toBe(false);
  });

  it("keeps navigation hotspots when activeTab is null", () => {
    const visible = filterDesktopHotspots(
      [navigationHotspot, generalHotspot, safetyHotspot, spaceHotspot],
      true,
      null,
    );

    expect(visible.map((hotspot) => hotspot.id)).toContain("nav-1");
    expect(visible.map((hotspot) => hotspot.id)).not.toContain("general-1");
    expect(visible.map((hotspot) => hotspot.id)).not.toContain("safety-1");
    expect(visible.map((hotspot) => hotspot.id)).not.toContain("space-1");
  });
});
