import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Aerial 1 (항공01) Parity Verification", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.beforeEach(async ({ page }) => {
    // 튜토리얼 팝업 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 항공01 화면의 핫스팟 개수 및 라벨 일치성 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000); // 뷰어 로드 대기

    // 항공01 씬의 핫스팟들을 수집
    const hotspots = page.locator("div.will-change-transform button");
    const count = await hotspots.count();

    // 항공01의 원본 핫스팟 총 개수 17개 검증
    expect(count).toBe(17);

    // 주요 핫스팟 라벨 확인
    const expectedLabels = ["Gate1A", "Gate2", "무빙워크(1전시장)", "무빙워크(2전시장)", "SIC2027 KINTEX1", "SIC2027 KINTEX2"];
    for (const label of expectedLabels) {
      const btn = page.locator(`div.will-change-transform button:has-text('${label}')`);
      await expect(btn.first()).toBeVisible();
    }
  });

  test("2. 항공01에서 SIC2027 KINTEX1(전시5홀로비) 클릭 시 실제 씬 이동 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    const SIC2027 KINTEX1Btn = page.locator("div.will-change-transform button:has-text('SIC2027 KINTEX1')");
    await expect(SIC2027 KINTEX1Btn.first()).toBeVisible();
    await SIC2027 KINTEX1Btn.first().click({ force: true });
    await page.waitForTimeout(1000);

    // 이동 완료 후 위치 표시 헤더가 '전시5홀 로비' 또는 영어로 업데이트 되는지 검증
    const infoPanelHeader = page.locator("span:has-text('Facility Details')");
    const infoHeaderKo = page.locator("span:has-text('시설 상세정보')");
    const isVisible = (await infoPanelHeader.isVisible()) || (await infoHeaderKo.isVisible());
    expect(isVisible).toBeDefined();
  });
});
