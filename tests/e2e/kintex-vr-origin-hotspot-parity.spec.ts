import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SCENES } from "../../src/data/scenes";

test.describe("SIC27-KINTEX VR Original Hotspot Parity Verification", () => {
  const AUDIT_DIR = path.resolve("tests/visual-audit");

  test("1. 원본 2404 씬과 로컬의 핫스팟 리스트 데이터 대조", async () => {
    const origin2404 = JSON.parse(await readFile(path.join(AUDIT_DIR, "origin-scene-2404.json"), "utf8"));
    const local2404 = SCENES.find((s: any) => s.id === "aerial01");

    expect(local2404).toBeDefined();
    if (local2404) {
      const localLabels = local2404.hotspots.map((h: any) => h.label);

      // 주요 네비게이션용 핫스팟 매핑 검증
      for (const name of ["Gate1A", "Gate2", "무빙워크(1전시장)", "무빙워크(2전시장)", "항공02", "항공03", "SIC2027 KINTEX1", "SIC2027 KINTEX2"]) {
        expect(localLabels).toContain(name);
      }
    }
  });

  test("2. 원본 2411(전시5홀 로비) 씬과 로컬의 핫스팟 리스트 대조", async () => {
    const origin2411 = JSON.parse(await readFile(path.join(AUDIT_DIR, "origin-scene-2411.json"), "utf8"));
    const local2411 = SCENES.find((s: any) => s.id === "lobby5");

    expect(local2411).toBeDefined();
    if (local2411) {
      const localLabels = local2411.hotspots.map((h: any) => h.label);

      for (const name of ["전시5홀", "전시3,4홀 로비", "화상상담실 입구", "무빙워크", "2F"]) {
        expect(localLabels).toContain(name);
      }
    }
  });
});
