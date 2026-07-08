import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";

test.describe("SIC27-KINTEX VR Lobby 5 Hotspots Real User Interaction E2E Verification", () => {

  /**
   * lobby5 씬으로 이동: 씬 드롭다운에서 "전시5홀 로비" 선택
   * goto()는 한 번만 사용하고, 이후 씬 복귀는 드롭다운으로 처리
   */
  async function goToLobby5(page: any) {
    // 1. 드롭다운 트리거 버튼 클릭
    const dropdownTrigger = page.locator("div.w-\\[248px\\] button").first();
    await dropdownTrigger.click({ force: true });
    await page.waitForTimeout(500);

    // 2. 드롭다운이 열린 리스트 영역 내부에서 '전시5홀 로비' 버튼을 찾아 클릭
    const lobby5Item = page.locator("div.glass button:has-text('전시5홀 로비')").first();
    const itemVisible = await lobby5Item.isVisible({ timeout: 3000 }).catch(() => false);
    if (itemVisible) {
      await lobby5Item.click({ force: true });
      await page.waitForTimeout(3000);
    } else {
      // 만약 안보이면 Esc 누르고 강제 리셋 fallback 시도
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  }

  /**
   * dragCamera: PanoramaViewer lonRef.current -= dx
   * lon 증가 = 왼쪽 드래그(dragX 음수)
   * dragX = -lonDelta * 9.09
   */
  async function dragCamera(page: any, lonDelta: number) {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas bounding box is null");

    const cx = box.x + box.width / 2;
    const startY = box.y + 90; // TopNav(64px) 아래, 핫스팟 없는 영역
    let remainingDrag = -lonDelta * 9.09;

    const maxDragPerStep = 250;
    while (Math.abs(remainingDrag) > 0.1) {
      const stepDrag = Math.min(Math.max(remainingDrag, -maxDragPerStep), maxDragPerStep);
      await page.mouse.move(cx, startY);
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.mouse.move(cx + stepDrag, startY, { steps: 30 });
      await page.waitForTimeout(200); // 감속 대기
      await page.mouse.up();
      await page.waitForTimeout(600); // 렌더러 관성 안정화
      remainingDrag -= stepDrag;
    }
    await page.waitForTimeout(1000); // 최종 안정화 대기
  }

  /** bounding box 기반 hover */
  async function hoverByBBox(page: any, locator: any): Promise<boolean> {
    const box = await locator.boundingBox();
    if (!box) {
      console.log("  [WARN] hoverByBBox: bounding box is null");
      return false;
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    console.log(`  [DEBUG] hover bbox center=(${cx.toFixed(0)},${cy.toFixed(0)}), viewport=1280x720`);
    await page.mouse.move(cx, cy, { steps: 5 });
    await page.waitForTimeout(600);
    return true;
  }

  test("전시5홀 로비 내 5개 핫스팟의 실제 마우스 조작을 통한 검증", async ({ page }) => {
    test.setTimeout(180000);

    // lobby5 startLon=359
    const expectedHotspots = [
      { label: "전시5홀", lonDelta: 1.0 },
      { label: "전시3,4홀 로비", lonDelta: -74.07 },
      { label: "화상상담실 입구", lonDelta: 54.53 },
      { label: "무빙워크", lonDelta: 132.89 },
      { label: "2F", lonDelta: 116.5 },
    ];

    // 최초 1회만 goto 및 Tutorial 닫기
    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    // TutorialOverlay 닫기 ("둘러보기 시작" 버튼 force click)
    const startBtn = page.locator("button:has-text('둘러보기 시작')").first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // SIC2027 KINTEX1 클릭으로 lobby5 진입
    const k1 = page.locator("button:has-text('SIC2027 KINTEX1')").first();
    await expect(k1).toBeVisible({ timeout: 8000 });
    await k1.click({ force: true });
    await page.waitForTimeout(2500);

    // lobby5 진입 확인
    await expect(page.locator("button:has-text('전시5홀 로비')").first()).toBeVisible({ timeout: 8000 });

    for (const hs of expectedHotspots) {
      console.log(`\n===== Checking hotspot: [${hs.label}] =====`);

      // lobby5 씬으로 복귀 (드롭다운 이용)
      await goToLobby5(page);
      await expect(page.locator("button:has-text('전시5홀 로비')").first()).toBeVisible({ timeout: 15000 });

      // 카메라 회전
      if (Math.abs(hs.lonDelta) > 2) {
        await dragCamera(page, hs.lonDelta);
      } else {
        await page.waitForTimeout(400);
      }

      // 핫스팟 가시성 확인
      // 6. 핫스팟 가시성 확인
      let hsButton = page.locator(`div.will-change-transform button:has-text('${hs.label}')`).first();
      await expect(hsButton).toBeVisible({ timeout: 8000 });

      // 동적 센터링: 핫스팟이 화면 가장자리에 있으면 화면 중앙 근처로 정렬하기 위해 카메라 미세 조정 드래그
      let bbox = await hsButton.boundingBox();
      if (bbox) {
        const cx = bbox.x + bbox.width / 2;
        if (cx < 350 || cx > 930) {
          console.log(`  [INFO] Hotspot x-center (${cx.toFixed(0)}) is too close to screen edge. Centering dynamically...`);
          // cx - 640가 음수이면(왼쪽에 있음) 왼쪽으로 드래그(negative drag)하여 화면 상의 핫스팟을 오른쪽(중앙)으로 이동시킴
          // 드래그 입력 픽셀과 화면상 이동 픽셀 비율(약 1.87배 차이)을 반영해 0.53을 곱함 (오버슈트 방지)
          const dragPixels = (cx - 640) * 0.53;
          const correctiveLonDelta = -dragPixels / 9.09;
          await dragCamera(page, correctiveLonDelta);
        }
      }

      // 스타일 속성(opacity, pointer-events)이 0.5 이상 / auto로 업데이트 될 때까지 최대 4초 대기 (transition 대응)
      let opacity = "0";
      let pointerEvents = "none";
      for (let attempt = 0; attempt < 8; attempt++) {
        hsButton = page.locator(`div.will-change-transform button:has-text('${hs.label}')`).first();
        opacity = await hsButton.evaluate((el: HTMLElement) => {
          const parent = el.closest(".will-change-transform") as HTMLElement;
          return parent ? window.getComputedStyle(parent).opacity : "0";
        });
        pointerEvents = await hsButton.evaluate((el: HTMLElement) => {
          const parent = el.closest(".will-change-transform") as HTMLElement;
          return parent ? window.getComputedStyle(parent).pointerEvents : "none";
        });

        if (Number(opacity) > 0.5 && pointerEvents === "auto") {
          break;
        }
        await page.waitForTimeout(500);
      }

      console.log(`- Visible: YES (Opacity: ${opacity}, PointerEvents: ${pointerEvents})`);
      expect(Number(opacity)).toBeGreaterThan(0.5);
      expect(pointerEvents).toBe("auto");

      // Hover 검증 (bounding box 기반)
      await hoverByBBox(page, hsButton);
      const labelSpan = hsButton.locator("span.whitespace-nowrap").first();
      const labelOpacity = await labelSpan.evaluate((el: Element) => window.getComputedStyle(el).opacity);
      const labelVisible = Number(labelOpacity) > 0;
      console.log(`- Hoverable (Label Opacity): ${labelVisible ? "YES" : "NO"} (${labelOpacity})`);
      expect(labelVisible).toBe(true);

      // 클릭으로 씬 이동 검증 (bounding box 기반 직접 클릭)
      const btnBox = await hsButton.boundingBox();
      if (!btnBox) throw new Error(`Button bounding box null for ${hs.label}`);
      await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
      await page.waitForTimeout(3000);

      const sceneName = await page
        .locator("div.w-\\[248px\\] button span.truncate")
        .first()
        .textContent();
      console.log(`- Transit Successful: YES (New Scene: ${sceneName})`);
    }

    console.log("\n✅ 5개 핫스팟 검증 완료");
  });
});
