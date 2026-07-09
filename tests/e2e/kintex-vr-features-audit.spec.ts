import { test, expect } from "@playwright/test";

test.describe("KINTEX VR 8대 신규 기능 E2E 검증", () => {
  // 사용 가능한 VITE_HOTSPOT_EDIT_MODE 포트 5175 지정
  const LOCAL_URL = "http://localhost:5175/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 비활성화 및 로컬 스토리지 주입
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. Dev Hotspot Editor 및 검색, 가이드 투어, 대피 훈련 통합 검증", async ({ page }) => {
    // 1. 페이지 접속
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(3000); // 로딩 대기

    // 2. 통합 검색 기능 검증 (Search Panel)
    const searchInput = page.locator("input[type='text']").first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Gate1A");
    await page.waitForTimeout(1000);

    // 검색 결과 항목 노출 확인 및 특정 드롭다운 내 항목 클릭
    const searchDropdownResult = page.locator("div.animate-rise-in button").first();
    await expect(searchDropdownResult).toBeVisible();
    await searchDropdownResult.click(); // 검색 결과 클릭하여 이동 및 포커싱
    await page.waitForTimeout(1500);

    // 3. 가이드 투어 제어 바 검증
    const docentBtn = page.locator("button:has-text('전시 투어 시작')");
    await expect(docentBtn).toBeVisible();
    await docentBtn.click();
    await page.waitForTimeout(1500);

    // 자막 노출 및 재생 확인
    const subtitle = page.locator("p:has-text('전시')");
    await expect(subtitle.first()).toBeVisible();

    const stopBtn = page.locator("button:has-text('종료')");
    await expect(stopBtn).toBeVisible();
    await stopBtn.click(); // 투어 중지
    await page.waitForTimeout(1000);

    // 4. 대피 훈련 가이드 검증
    const safetyBtn = page.locator("button:has-text('대피 훈련 시작')");
    await expect(safetyBtn).toBeVisible();
    await safetyBtn.click();
    await page.waitForTimeout(1500);

    // 대피 자막 확인
    const safetySubtitle = page.locator("p:has-text('대피')");
    await expect(safetySubtitle.first()).toBeVisible();
    
    // 안전 가이드 중지
    await page.locator("button:has-text('종료')").click();
    await page.waitForTimeout(1000);
  });
});
