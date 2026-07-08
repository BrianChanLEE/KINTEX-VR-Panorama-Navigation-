import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("Verify KINTEX Pointer Pins on aerial01, aerial02, aerial03", () => {
  const LOCAL_URL = "http://localhost:5173/";
  const AUDIT_DIR = path.resolve("tests/visual-audit/kintex-pin");

  test("Verify and Capture KINTEX Pins", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(LOCAL_URL, { waitUntil: "networkidle" });
    
    // Suppress tutorial
    await page.evaluate(() => window.localStorage.setItem("kmice_hide_tutorial", "1"));
    await page.goto(LOCAL_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // aerial01
    await page.screenshot({ path: path.join(AUDIT_DIR, "aerial01.png") });
    console.log("aerial01 screenshot saved.");

    // Go to aerial02 via dropdown or direct navigate
    // Let's click Dropdown to navigate to aerial02
    await page.click(".panorama-map");
    await page.waitForTimeout(500);
    // Find item with '항공02'
    const item2 = page.locator("button.scene-item:has-text('항공02')").first();
    await item2.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(AUDIT_DIR, "aerial02.png") });
    console.log("aerial02 screenshot saved.");

    // Go to aerial03
    await page.click(".panorama-map");
    await page.waitForTimeout(500);
    const item3 = page.locator("button.scene-item:has-text('항공03')").first();
    await item3.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(AUDIT_DIR, "aerial03.png") });
    console.log("aerial03 screenshot saved.");
  });
});
