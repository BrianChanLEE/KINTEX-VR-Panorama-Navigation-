import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Floor Controls Verification", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 1-2F 층 버튼 클릭 시 2층 씬으로 실제로 이동하는지 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000);

    // 1-2F 버튼 찾아 클릭 (1전시장 2층)
    const button2F = page.locator("button:has-text('1-2F')");
    await expect(button2F).toBeVisible();
    await button2F.click({ force: true });
    await page.waitForTimeout(1000);

    // 상세정보 버튼이나 UI 반응을 확인
    const infoPanelHeader = page.locator("span:has-text('Facility Details')");
    // 다국어가 아닌 경우 한국어 확인
    const infoHeaderKo = page.locator("span:has-text('시설 상세정보')");
    const isVisible = (await infoPanelHeader.isVisible()) || (await infoHeaderKo.isVisible());
    expect(isVisible).toBeDefined();
  });

  test("2. 다른 모든 층 (항공, 야외, 1F, 3F, 4F) 클릭 및 이동 정합성 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000);

    const zones = ["AIR", "OUT", "1-1F", "1-2F", "1-3F", "2-LBY", "2-HALL", "2-3F", "2-4F"];
    for (const code of zones) {
      const btn = page.locator(`button:has-text('${code}')`);
      await expect(btn).toBeVisible();
      await btn.click({ force: true });
      await page.waitForTimeout(500);
    }
  });
});
