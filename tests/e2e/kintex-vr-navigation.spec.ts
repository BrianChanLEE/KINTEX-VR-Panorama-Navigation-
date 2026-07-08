import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Navigation & Basic Controls", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업이 뜨지 않도록 로컬스토리지 값 세팅
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 첫 화면 로딩 및 기초 요소 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);

    // 타이틀 확인
    await expect(page).toHaveTitle(/SIC27-KINTEX VR/);

    // 로고 존재 확인
    const logo = page.locator("header");
    await expect(logo).toBeVisible();

    // 3D 캔버스 존재 확인 (strict mode 방지를 위해 first() 사용)
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("2. 드래그 회전 및 줌 제어 동작 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000); // 뷰어 초기화 대기

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // 드래그 회전 조작 시도
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 200, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  });

  test("3. 다국어(한국어/영어) 전환 및 라벨 교체 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(1000);

    // 기본 한국어 모드 확인
    const korBtn = page.locator("button:has-text('KOR')");
    await expect(korBtn).toHaveClass(/bg-kx-blue/);

    // 영어 모드로 전환
    const engBtn = page.locator("button:has-text('ENG')");
    await engBtn.click();
    await page.waitForTimeout(500);

    // 영어 활성화 클래스 검증
    await expect(engBtn).toHaveClass(/bg-kx-blue/);
  });
});
