import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Lobby Hotspots (전시장 로비) Parity Verification", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 전시5홀 로비에서 4대 주요 지점으로의 네비게이션 동작 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    // 항공01에서 SIC2027 KINTEX1(전시5홀 로비) 클릭하여 로비 진입
    const sicKintex1Btn = page.locator("div.will-change-transform button:has-text('SIC2027 KINTEX1')");
    await sicKintex1Btn.first().click({ force: true });
    await page.waitForTimeout(1500);

    // 1. 전시3,4홀 로비 이동 검증
    // 카메라 각도를 전시3,4홀 로비 핫스팟 방향(lon: 284.93, lat: 0.67)으로 회전
    await page.evaluate(() => {
      if ((window as any).__setCameraDirection) {
        (window as any).__setCameraDirection(284.93, 0.67);
      }
    });
    await page.waitForTimeout(500);

    const lobby34 = page.locator("div.will-change-transform button:has-text('전시3,4홀 로비')");
    await expect(lobby34.first()).toBeVisible();
    await lobby34.first().click({ force: true });
    await page.waitForTimeout(1500);

    // 2. 전시3,4홀 로비에서 전시5홀 로비로의 역방향 핫스팟 클릭 복귀 검증
    // 전시5홀 로비 핫스팟 방향(lon: 88.96, lat: -0.45)으로 회전
    await page.evaluate(() => {
      if ((window as any).__setCameraDirection) {
        (window as any).__setCameraDirection(88.96, -0.45);
      }
    });
    await page.waitForTimeout(500);

    const backToLby5 = page.locator("div.will-change-transform button:has-text('전시5홀 로비')");
    await expect(backToLby5.first()).toBeVisible();
    await backToLby5.first().click({ force: true });
    await page.waitForTimeout(1500);

    // 3. 화상상담실 입구 이동 검증
    // 복귀된 전시5홀 로비에서 카메라 각도를 화상상담실 입구 핫스팟 방향(lon: 53.53, lat: -0.64)으로 회전
    await page.evaluate(() => {
      if ((window as any).__setCameraDirection) {
        (window as any).__setCameraDirection(53.53, -0.64);
      }
    });
    await page.waitForTimeout(500);

    const roomBtn = page.locator("div.will-change-transform button:has-text('화상상담실 입구')");
    await expect(roomBtn.first()).toBeVisible();
    await roomBtn.first().click({ force: true });
    await page.waitForTimeout(1000);
  });
});
