import { expect, test } from "@playwright/test";

test.describe("service menu and hotspot visibility", () => {
  const LOCAL_URL = "https://127.0.0.1:4173/";

  test.use({ ignoreHTTPSErrors: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });
  });

  test("new service tabs render and navigation hotspots stay visible", async ({ page }) => {
    await page.goto(LOCAL_URL);

    const navigationHotspots = page.locator('[data-hotspot-kind="navigation"]');
    const mapTourTab = page.getByRole("button", { name: "지도 투어" }).first();
    const stampTourTab = page.getByRole("button", { name: "스탬프 투어" }).first();
    const evacuationTab = page.getByRole("button", { name: "대피 훈련" }).first();
    const expandButton = page.getByRole("button", { name: "서비스 메뉴 펼치기" }).first();

    await expect(expandButton).toBeVisible();
    await expect(mapTourTab).not.toBeVisible();
    await expect(stampTourTab).not.toBeVisible();
    await expect(evacuationTab).not.toBeVisible();
    await expect(page.getByRole("button", { name: "일반정보" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "안전정보" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "공간정보" })).toHaveCount(0);

    const initialCount = await navigationHotspots.count();
    expect(initialCount).toBeGreaterThan(0);

    await expandButton.evaluate((node) => (node as HTMLButtonElement).click());
    await expect(mapTourTab).toBeVisible();

    await mapTourTab.evaluate((node) => (node as HTMLButtonElement).click());
    await expect(page.getByText("3D 지도 Placeholder")).toBeVisible();
    await expect(navigationHotspots).toHaveCount(initialCount);

    await page.locator(".floor-btn").first().click();
    await expect(navigationHotspots).toHaveCount(initialCount);

    await stampTourTab.evaluate((node) => (node as HTMLButtonElement).click());
    await expect(page.getByRole("heading", { name: "스탬프 투어" })).toBeVisible();
    await expect(navigationHotspots).toHaveCount(initialCount);

    await evacuationTab.evaluate((node) => (node as HTMLButtonElement).click());
    await expect(page.getByRole("heading", { name: "대피 훈련" })).toBeVisible();
    await expect(navigationHotspots).toHaveCount(initialCount);
  });
});
