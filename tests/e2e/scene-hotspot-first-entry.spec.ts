import { expect, test } from "@playwright/test";

const SCENE_CASES = [
  {
    openLabel: "2F 로비",
    currentLabel: "2F 로비",
  },
  {
    openLabel: "전시1,2홀 로비",
    currentLabel: "전시1,2홀 로비",
  },
] as const;

test.describe("scene hotspot first-entry visibility", () => {
  test.use({ ignoreHTTPSErrors: true, viewport: { width: 1782, height: 1188 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  for (const sceneCase of SCENE_CASES) {
    test(`first entry and re-entry keep navigation hotspots visible: ${sceneCase.currentLabel}`, async ({ page }) => {
      await page.goto("https://127.0.0.1:4173/", { waitUntil: "networkidle" });

      const dropdownTrigger = page.locator(".panorama-map").first();
      await expect(dropdownTrigger).toBeVisible();
      await dropdownTrigger.click();

      const targetScene = page.getByRole("button", { name: sceneCase.openLabel }).first();
      await expect(targetScene).toBeVisible();
      await targetScene.click({ force: true });

      await expect(page.locator(".panorama-map .map-text").first()).toHaveText(sceneCase.currentLabel, { timeout: 15000 });
      const firstEntryCount = await page.locator('[data-hotspot-kind="navigation"]').count();
      expect(firstEntryCount).toBeGreaterThan(0);

      await dropdownTrigger.click();
      await expect(targetScene).toBeVisible();
      await targetScene.click({ force: true });
      await expect(page.locator(".panorama-map .map-text").first()).toHaveText(sceneCase.currentLabel, { timeout: 15000 });
      const reEntryCount = await page.locator('[data-hotspot-kind="navigation"]').count();
      expect(reEntryCount).toBe(firstEntryCount);
    });
  }
});
