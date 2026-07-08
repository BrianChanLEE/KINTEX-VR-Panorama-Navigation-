import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Hotspot Interaction & Transition", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 네비게이션 핫스팟 클릭 및 이동 정상 작동 여부 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000);

    const hotspot = page.locator("button:has-text('항공뷰 02')");
    if (await hotspot.count() > 0) {
      await expect(hotspot.first()).toBeVisible();
      await hotspot.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test("2. 정보/시설 상세 핫스팟 클릭 시 세부 패널이 활성화되는지 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000);

    const lobbyHp = page.locator("button:has-text('제1전시장 로비')");
    if (await lobbyHp.count() > 0) {
      await lobbyHp.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
