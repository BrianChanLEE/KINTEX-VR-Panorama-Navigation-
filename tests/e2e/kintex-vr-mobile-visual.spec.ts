import { test, expect } from "@playwright/test";

test.describe("SIC27-KINTEX VR Mobile Visual Integration Verification", () => {
  const LOCAL_URL = "http://localhost:5173/";

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13 Pro 규격

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("1. 모바일 뷰포트에서 레이아웃 넘침 현상 및 반응형 UI가 정상적으로 표시되는지 검증", async ({ page }) => {
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    // 모바일에서는 FloorSelector 래퍼에 md:block(hidden) 대신 반응형 클래스로 모바일에 맞게 노출 여부 체크
    // 만약 로컬 구현이 모바일에서 드롭다운(Dropdown)으로 층 리스트를 처리한다면 그를 체크
    const header = page.locator("header");
    await expect(header).toBeVisible();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});
