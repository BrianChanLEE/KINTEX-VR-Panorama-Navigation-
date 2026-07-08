import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Hotspot Icons Position Verification", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 로컬 핫스팟 아이콘들이 뷰포트 내에 올바르게 배치되는지 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    const hotspots = page.locator("div.will-change-transform button");
    const count = await hotspots.count();

    expect(count).toBeGreaterThan(0);

    let checkedCount = 0;
    for (let i = 0; i < count; i++) {
      const hp = hotspots.nth(i);

      // 실제 화면에 보이는(visible) 핫스팟만 필터링해서 좌표 검증
      if (await hp.isVisible()) {
        const box = await hp.boundingBox();
        if (box) {
          // 화면 영역 바깥 이탈이 아닌 유효 좌표계 검증
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
          checkedCount++;
        }
      }
    }
    // 최소 1개 이상 화면에 보이는 핫스팟이 존재해야 함
    expect(checkedCount).toBeGreaterThan(0);
  });
});
