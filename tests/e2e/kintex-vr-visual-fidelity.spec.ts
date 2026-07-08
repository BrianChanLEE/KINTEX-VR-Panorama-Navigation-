import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test.describe.serial("SIC27-KINTEX VR Visual Fidelity & Viewport Screenshots", () => {
  const ORIGIN_URL = "https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko";
  const LOCAL_URL = "http://localhost:5173/";
  const DIFF_DIR = path.resolve("tests/visual-audit/diff");

  test.beforeAll(async () => {
    await mkdir(DIFF_DIR, { recursive: true });
  });

  const captureCompare = async (page: any, viewport: { width: number; height: number }, name: string) => {
    await page.setViewportSize(viewport);

    // 1. 원본 캡처
    try {
      await page.goto(ORIGIN_URL, { timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(DIFF_DIR, `origin-${name}.png`) });
    } catch (e) {
      console.warn(`Origin capture skipped for viewport ${name}`);
    }

    // 2. 로컬 캡처
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(DIFF_DIR, `local-${name}.png`) });
  };

  test("1. Desktop Viewport (1920x1080) Capture", async ({ page }) => {
    await captureCompare(page, { width: 1920, height: 1080 }, "desktop");
  });

  test("2. Laptop Viewport (1440x900) Capture", async ({ page }) => {
    await captureCompare(page, { width: 1440, height: 900 }, "laptop");
  });

  test("3. Mobile Viewport (390x844) Capture", async ({ page }) => {
    await captureCompare(page, { width: 390, height: 844 }, "mobile");
  });
});
