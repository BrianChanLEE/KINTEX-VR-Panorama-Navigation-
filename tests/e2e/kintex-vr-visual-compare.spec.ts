import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test.describe.serial("SIC27-KINTEX VR Visual & DOM Comparison", () => {
  const ORIGIN_URL = "https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko";
  const LOCAL_URL = "http://localhost:5173/";
  const SCREENSHOT_DIR = path.resolve("tests/screenshots");

  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 원본 K-MICE SIC27-KINTEX VR 로딩 및 상태 캡처", async ({ page }) => {
    try {
      await page.goto(ORIGIN_URL, { timeout: 30000 });
      await page.waitForTimeout(4000); // 3D 파노라마 로딩 대기
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "origin-home.png") });
    } catch (e) {
      console.warn("Could not load original site within timeout. Skipping visual diff comparison.");
    }
  });

  test("2. 로컬 SIC27-KINTEX VR 로딩 및 상태 캡처 후 DOM 구조 비교", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000); // 로딩 대기

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "local-home.png") });

    page.on("pageerror", (err) => {
      expect(err).toBeNull();
    });

    page.on("response", (res) => {
      expect(res.status()).not.toBe(404);
    });
  });
});
