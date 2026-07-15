import { describe, expect, it } from "bun:test";
import { SERVICE_TAB_ITEMS, MAP_TOUR_DESTINATIONS } from "../../src/data/service-menu";

describe("service menu config", () => {
  it("keeps new service tab order", () => {
    expect(SERVICE_TAB_ITEMS.map((item) => item.id)).toEqual([
      "map-tour",
      "stamp-tour",
      "evacuation-training",
    ]);
    expect(SERVICE_TAB_ITEMS.map((item) => item.label)).toEqual([
      "지도 투어",
      "스탬프 투어",
      "대피 훈련",
    ]);
  });

  it("includes map tour destination categories", () => {
    expect(MAP_TOUR_DESTINATIONS.map((item) => item.label)).toContain("전시홀");
    expect(MAP_TOUR_DESTINATIONS.map((item) => item.label)).toContain("비상구");
  });
});

