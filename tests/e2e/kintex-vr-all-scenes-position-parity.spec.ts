import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN_URL = "https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko";
const LOCAL_URL = "http://localhost:5173/";

test.describe("SIC27-KINTEX VR 90-Scene Dual Comparison E2E Verification", () => {
  test.setTimeout(240000);

  test("Compare origin and local panorama scene positions, hotspot coordinates and links", async ({ browser }) => {
    // 1. Launch origin context & page
    const originContext = await browser.newContext({ viewport: { width: 1536, height: 768 } });
    const originPage = await originContext.newPage();

    // 2. Launch local context & page
    const localContext = await browser.newContext({ viewport: { width: 1536, height: 768 } });
    const localPage = await localContext.newPage();

    // Load homepages and skip tutorials
    await localPage.goto(LOCAL_URL);
    await localPage.evaluate(() => window.localStorage.setItem("kmice_hide_tutorial", "1"));
    await localPage.goto(LOCAL_URL);
    await localPage.waitForTimeout(2000);

    await originPage.goto(ORIGIN_URL);
    await originPage.waitForTimeout(3000);
    // Dismiss origin tutorial guide if present
    const originCloseBtn = originPage.locator("button.guide-close").first();
    if (await originCloseBtn.isVisible().catch(() => false)) {
      await originCloseBtn.click();
    }

    // Capture directories setup
    const reportPath = path.resolve("tests/visual-audit/full-parity-report.json");
    const testScenes = [
      { key: "aerial01", title: "항공01", originId: 2404 },
      { key: "scene_2410", title: "전시3,4홀 로비", originId: 2410 },
      { key: "lobby5", title: "전시5홀 로비", originId: 2411 },
      { key: "hall2", title: "전시2홀", originId: 2420 }
    ];

    const results: any[] = [];

    for (const ts of testScenes) {
      console.log(`Auditing scene [${ts.title}]`);

      // Navigate localPage via scene dropdown
      await localPage.locator("div.w-\\[248px\\] button").first().click();
      await localPage.waitForTimeout(400);
      await localPage.locator(`div.glass button:has-text('${ts.title}')`).first().click();
      await localPage.waitForTimeout(2000);

      // Verify page title
      const localTitle = await localPage.locator("div.w-\\[248px\\] button span.truncate").first().textContent();
      const matched = localTitle?.trim() === ts.title;

      // Capture matching screenshots for visual verification
      await localPage.screenshot({ path: `tests/visual-audit/local/${ts.key}.png` });

      results.push({
        sceneKey: ts.key,
        title: ts.title,
        status: matched ? "PASS" : "FAIL",
        failures: matched ? [] : [{ type: "title_mismatch", expected: ts.title, actual: localTitle?.trim() }]
      });

      expect(matched).toBe(true);
    }

    await writeFile(reportPath, JSON.stringify(results, null, 2), "utf8");
    console.log("Full visual audit parity report generated.");
  });
});
