import { expect, test } from "@playwright/test";

test.use({
  ignoreHTTPSErrors: true,
  viewport: { width: 1782, height: 1188 },
});

test.describe("service menu smoke test", () => {
  test("지도 투어 탭에서 서비스 메뉴 뼈대와 네비게이션 마커가 함께 보인다", async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });

    await page.goto("https://127.0.0.1:4173/", { waitUntil: "networkidle" });

    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "서비스 메뉴 펼치기" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "지도 투어" }).first()).not.toBeVisible();

    await page.getByRole("button", { name: "서비스 메뉴 펼치기" }).first().evaluate((node) => (node as HTMLButtonElement).click());
    await expect(page.getByRole("button", { name: "지도 투어" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "스탬프 투어" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "대피 훈련" }).first()).toBeVisible();

    await page.getByRole("button", { name: "지도 투어" }).first().evaluate((node) => (node as HTMLButtonElement).click());
    await expect(page.getByText("3D 지도 Placeholder")).toBeVisible();
    await expect(page.getByText("현재 위치")).toBeVisible();
    expect(await page.locator('[data-hotspot-kind="navigation"]').count()).toBeGreaterThan(0);

    await page.getByRole("button", { name: "전시홀" }).first().click();

    expect(failedRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
