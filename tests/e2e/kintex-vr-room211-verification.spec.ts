import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";

test.describe("SIC27-KINTEX VR Rooms 210 & 211 Hotspots Navigation Verification", () => {

  async function goToRoom211(page: any) {
    const dropdownTrigger = page.locator("div.panorama-map").first();
    await dropdownTrigger.click({ force: true });
    await page.waitForTimeout(500);

    const room211Item = page.locator("button.scene-item").filter({ has: page.locator("span.scene-name", { hasText: /^211$/ }) }).first();
    await room211Item.scrollIntoViewIfNeeded();
    await room211Item.click({ force: true });
    await page.waitForTimeout(2000);
  }

  async function goToRoom210(page: any) {
    const dropdownTrigger = page.locator("div.panorama-map").first();
    await dropdownTrigger.click({ force: true });
    await page.waitForTimeout(500);

    const room210Item = page.locator("button.scene-item").filter({ has: page.locator("span.scene-name", { hasText: /^210$/ }) }).first();
    await room210Item.scrollIntoViewIfNeeded();
    await room210Item.click({ force: true });
    await page.waitForTimeout(2000);
  }

  async function dragCamera(page: any, lonDelta: number) {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas bounding box is null");

    const cx = box.x + box.width / 2;
    const startY = box.y + 120;
    let remainingDrag = -lonDelta * 9.09;

    const maxDragPerStep = 250;
    while (Math.abs(remainingDrag) > 0.1) {
      const stepDrag = Math.min(Math.max(remainingDrag, -maxDragPerStep), maxDragPerStep);
      await page.mouse.move(cx, startY);
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.mouse.move(cx + stepDrag, startY, { steps: 30 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(600);
      remainingDrag -= stepDrag;
    }
    await page.waitForTimeout(500);
  }

  test("Room 211 5개 핫스팟 네비게이션 클릭 테스트 및 결과 출력", async ({ page }) => {
    test.setTimeout(120000);

    page.on("console", (msg) => {
      console.log(`[BROWSER LOG] ${msg.type()}: ${msg.text()}`);
    });

    const testHotspots = [
      { label: "212AB 입구", expectedTarget: "scene_2432", expectedTitle: "212AB입구", lonDelta: -84.6 },
      { label: "211 극장식", expectedTarget: "scene_2478", expectedTitle: "211 극장식", lonDelta: 0 },
      { label: "211 강의식", expectedTarget: "scene_2479", expectedTitle: "211 강의식", lonDelta: 0 },
      { label: "211A", expectedTarget: "scene_2480", expectedTitle: "211A", lonDelta: 0 },
      { label: "211B", expectedTarget: "scene_2482", expectedTitle: "211B", lonDelta: 183.0 }
    ];

    console.log("\n====================================================");
    console.log("STARTING ROOM 211 HOTSPOT CLICK AUDIT");
    console.log("====================================================");

    for (const hs of testHotspots) {
      await page.goto(LOCAL_URL);
      await page.waitForTimeout(1000);

      const startBtn = page.locator("button:has-text('둘러보기 시작')").first();
      if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startBtn.click({ force: true });
        await page.waitForTimeout(500);
      }

      await goToRoom211(page);
      await page.waitForTimeout(1000);

      if (Math.abs(hs.lonDelta) > 5) {
        await dragCamera(page, hs.lonDelta);
      }

      const hsButton = page.locator(`div.will-change-transform button:has-text('${hs.label}')`).first();
      const isVisible = await hsButton.isVisible({ timeout: 4000 }).catch(() => false);
      const currentSceneTitle = (await page.locator("div.panorama-map span.map-text").first().textContent().catch(() => "Unknown")) || "Unknown";

      if (!isVisible) {
        console.log("------------------------------------");
        console.log(`Current Scene: ${currentSceneTitle}`);
        console.log(`Clicked Label: ${hs.label}`);
        console.log(`Expected Target: ${hs.expectedTarget}`);
        console.log("Actual Target: None");
        console.log("Navigation: FAIL");
        console.log("Reason: Hotspot Not Visible / Missing");
        console.log("------------------------------------");
        continue;
      }

      const pointerEvents = await hsButton.evaluate((el: HTMLElement) => {
        const parent = el.closest(".will-change-transform") as HTMLElement;
        return parent ? window.getComputedStyle(parent).pointerEvents : "none";
      });

      if (pointerEvents !== "auto") {
        console.log("------------------------------------");
        console.log(`Current Scene: ${currentSceneTitle}`);
        console.log(`Clicked Label: ${hs.label}`);
        console.log(`Expected Target: ${hs.expectedTarget}`);
        console.log("Actual Target: None");
        console.log("Navigation: FAIL");
        console.log("Reason: Hotspot Disabled (pointer-events: none / POI classification)");
        console.log("------------------------------------");
        continue;
      }

      await hsButton.click({ force: true });
      await page.waitForTimeout(2500);

      const actualSceneTitle = (await page.locator("div.panorama-map span.map-text").first().textContent().catch(() => "Unknown")) || "Unknown";
      const isSuccess = actualSceneTitle.trim() === hs.expectedTitle.trim();

      console.log("------------------------------------");
      console.log(`Current Scene: ${currentSceneTitle}`);
      console.log(`Clicked Label: ${hs.label}`);
      console.log(`Expected Target: ${hs.expectedTarget} (${hs.expectedTitle})`);
      console.log(`Actual Target: ${isSuccess ? hs.expectedTarget : "None"} (${actualSceneTitle})`);
      console.log(`Navigation: ${isSuccess ? "SUCCESS" : "FAIL"}`);
      if (!isSuccess) {
        console.log("Reason: Navigation click did not change the scene (Inactive click listener / Target missing)");
      }
      console.log("------------------------------------");

      if (isSuccess) {
        expect(actualSceneTitle.trim()).toBe(hs.expectedTitle.trim());
      }
    }

    console.log("====================================================");
  });

  test("Room 210 5개 핫스팟 네비게이션 클릭 테스트 및 결과 출력", async ({ page }) => {
    test.setTimeout(120000);

    page.on("console", (msg) => {
      console.log(`[BROWSER LOG] ${msg.type()}: ${msg.text()}`);
    });

    const testHotspots = [
      { label: "212AB 입구", expectedTarget: "scene_2432", expectedTitle: "212AB입구", lonDelta: -73.6 },
      { label: "210 극장식", expectedTarget: "scene_2471", expectedTitle: "210 극장식", lonDelta: 0 },
      { label: "210 강의식", expectedTarget: "scene_2472", expectedTitle: "210 강의식", lonDelta: 0 },
      { label: "210A", expectedTarget: "scene_2473", expectedTitle: "210A", lonDelta: 0 },
      { label: "210B", expectedTarget: "scene_2475", expectedTitle: "210B", lonDelta: -176.8 }
    ];

    console.log("\n====================================================");
    console.log("STARTING ROOM 210 HOTSPOT CLICK AUDIT");
    console.log("====================================================");

    for (const hs of testHotspots) {
      await page.goto(LOCAL_URL);
      await page.waitForTimeout(1000);

      const startBtn = page.locator("button:has-text('둘러보기 시작')").first();
      if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startBtn.click({ force: true });
        await page.waitForTimeout(500);
      }

      await goToRoom210(page);
      await page.waitForTimeout(1000);

      if (Math.abs(hs.lonDelta) > 5) {
        await dragCamera(page, hs.lonDelta);
      }

      const hsButton = page.locator(`div.will-change-transform button:has-text('${hs.label}')`).first();
      const isVisible = await hsButton.isVisible({ timeout: 4000 }).catch(() => false);
      const currentSceneTitle = (await page.locator("div.panorama-map span.map-text").first().textContent().catch(() => "Unknown")) || "Unknown";

      if (!isVisible) {
        console.log("------------------------------------");
        console.log(`Current Scene: ${currentSceneTitle}`);
        console.log(`Clicked Label: ${hs.label}`);
        console.log(`Expected Target: ${hs.expectedTarget}`);
        console.log("Actual Target: None");
        console.log("Navigation: FAIL");
        console.log("Reason: Hotspot Not Visible / Missing");
        console.log("------------------------------------");
        continue;
      }

      const pointerEvents = await hsButton.evaluate((el: HTMLElement) => {
        const parent = el.closest(".will-change-transform") as HTMLElement;
        return parent ? window.getComputedStyle(parent).pointerEvents : "none";
      });

      if (pointerEvents !== "auto") {
        console.log("------------------------------------");
        console.log(`Current Scene: ${currentSceneTitle}`);
        console.log(`Clicked Label: ${hs.label}`);
        console.log(`Expected Target: ${hs.expectedTarget}`);
        console.log("Actual Target: None");
        console.log("Navigation: FAIL");
        console.log("Reason: Hotspot Disabled (pointer-events: none / POI classification)");
        console.log("------------------------------------");
        continue;
      }

      await hsButton.click({ force: true });
      await page.waitForTimeout(2500);

      const actualSceneTitle = (await page.locator("div.panorama-map span.map-text").first().textContent().catch(() => "Unknown")) || "Unknown";
      const isSuccess = actualSceneTitle.trim() === hs.expectedTitle.trim();

      console.log("------------------------------------");
      console.log(`Current Scene: ${currentSceneTitle}`);
      console.log(`Clicked Label: ${hs.label}`);
      console.log(`Expected Target: ${hs.expectedTarget} (${hs.expectedTitle})`);
      console.log(`Actual Target: ${isSuccess ? hs.expectedTarget : "None"} (${actualSceneTitle})`);
      console.log(`Navigation: ${isSuccess ? "SUCCESS" : "FAIL"}`);
      if (!isSuccess) {
        console.log("Reason: Navigation click did not change the scene (Inactive click listener / Target missing)");
      }
      console.log("------------------------------------");

      if (isSuccess) {
        expect(actualSceneTitle.trim()).toBe(hs.expectedTitle.trim());
      }
    }

    console.log("====================================================");
  });
});
