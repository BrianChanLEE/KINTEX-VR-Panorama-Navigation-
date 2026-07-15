import { test, expect } from "@playwright/test";

test.describe("KINTEX-VR Map Tour Navigation E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Disable tutorial popup
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. Map Tour Tab and Destination Selection", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000); // Wait for viewer load

    // Open Service Menu popup
    const toggleBtn = page.locator("button[aria-label*='서비스 메뉴']");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Verify "지도 투어" (Map Tour) tab is active
    const mapTourTab = page.locator("button:has-text('지도 투어')");
    await expect(mapTourTab).toBeVisible();

    // Select Destination Scene "전시1,2홀 로비"
    const destinationBtn = page.locator("button:has-text('전시1,2홀 로비')").first();
    await expect(destinationBtn).toBeVisible();
    await destinationBtn.click();
    await page.waitForTimeout(500);

    // Verify preview mode details card displays "목적지: 전시1,2홀 로비" and "모드: 미리보기"
    const previewModeText = page.getByText("모드: 미리보기");
    await expect(previewModeText).toBeVisible();
    const destinationText = page.getByText("목적지: 전시1,2홀 로비");
    await expect(destinationText).toBeVisible();

    // Verify ThreeMapCanvas is rendered (canvas within the Map Tour popup)
    const mapsCanvas = page.locator(".relative canvas").first();
    await expect(mapsCanvas).toBeVisible();

    // Click "안내 시작" (Start Navigation)
    const startNavBtn = page.locator("button:has-text('안내 시작')");
    await expect(startNavBtn).toBeVisible();
    await expect(startNavBtn).not.toBeDisabled();
    await startNavBtn.click();
    await page.waitForTimeout(500);

    // Verify guiding mode active "모드: 안내 중"
    const guidingModeText = page.getByText("모드: 안내 중");
    await expect(guidingModeText).toBeVisible();
  });
});
