import { test, expect } from "@playwright/test";
import { SCENES } from "../../src/data/scenes";

test.describe("SIC27-KINTEX VR Scene Mapping Parity Verification", () => {
  test("1. 전체 90개 씬의 데이터 매핑 유효성 검증", async () => {
    // 전체 씬이 정확히 90개 존재하는지 체크
    expect(SCENES.length).toBe(90);

    // 씬들 중 핫스팟 타겟이 존재하지 않거나 null이 있는지 검사
    for (const scene of SCENES) {
      expect(scene.id).toBeDefined();
      expect(scene.ko).toBeDefined();
      expect(scene.img).toBeDefined();

      for (const h of scene.hotspots) {
        if (h.kind === "nav") {
          expect(h.target).toBeDefined();
          // target 씬이 실제 90개 목록 내에 존재하는지 체크
          const targetExists = SCENES.some((s: any) => s.id === h.target);
          expect(targetExists).toBe(true);
        }
      }
    }
  });
});
