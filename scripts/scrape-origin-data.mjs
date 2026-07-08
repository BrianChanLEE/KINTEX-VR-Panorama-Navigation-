import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const AUDIT_DIR = path.resolve("tests/visual-audit");
  await mkdir(AUDIT_DIR, { recursive: true });

  console.log("Connecting to K-MICE SIC27-KINTEX VR...");
  await page.goto("https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko", { timeout: 45000 });
  await page.waitForTimeout(5000); // 세션 확립 대기

  const frame = page.frame({ url: /vr\/scenes/ });
  if (!frame) {
    console.error("Could not find the VR player iframe.");
    await browser.close();
    return;
  }

  // iframe 세션을 활용하여 2404, 2410, 2411 씬의 원본 json API 호출 덤프
  console.log("Fetching original scene data JSONs from server...");
  const fetchSceneData = async (sceneId) => {
    return await frame.evaluate(async (id) => {
      const r = await fetch(`/vr/scenes/${id}.kto?time=${Date.now()}&lang=ko`, {
        headers: { "Accept": "application/json", "Content-Type": "application/json" }
      });
      const j = await r.json();
      return JSON.parse(j.sceneData);
    }, sceneId);
  };

  const scene2404 = await fetchSceneData(2404);
  const scene2410 = await fetchSceneData(2410);
  const scene2411 = await fetchSceneData(2411);

  await writeFile(path.join(AUDIT_DIR, "origin-scene-2404.json"), JSON.stringify(scene2404, null, 2), "utf8");
  await writeFile(path.join(AUDIT_DIR, "origin-scene-2410.json"), JSON.stringify(scene2410, null, 2), "utf8");
  await writeFile(path.join(AUDIT_DIR, "origin-scene-2411.json"), JSON.stringify(scene2411, null, 2), "utf8");
  
  console.log("Original scene JSONs saved successfully in tests/visual-audit/");
  await browser.close();
}

run().catch(console.error);
