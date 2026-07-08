import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test.describe("Visual Audit Screenshot Generator for aerial01", () => {
  const ORIGIN_URL = "https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko";
  const LOCAL_URL = "http://localhost:5173/";
  const AUDIT_DIR = path.resolve("tests/visual-audit/aerial01");

  test.beforeAll(async () => {
    await mkdir(AUDIT_DIR, { recursive: true });
  });

  test("1. Capture origin aerial01", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(ORIGIN_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(5000);
    // Dismiss guide if present
    const closeBtn = page.locator("button.guide-close").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(AUDIT_DIR, "origin.png") });
    console.log("Origin aerial01 screenshot captured.");
  });

  test("2. Capture local-before aerial01", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 768 });
    await page.goto(LOCAL_URL, { waitUntil: "networkidle", timeout: 30000 });
    // Suppress tutorial
    await page.evaluate(() => window.localStorage.setItem("kmice_hide_tutorial", "1"));
    await page.goto(LOCAL_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(AUDIT_DIR, "local-before.png") });
    console.log("Local before aerial01 screenshot captured.");
  });
});
