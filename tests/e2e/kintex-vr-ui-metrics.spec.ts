import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

test.describe.serial("SIC27-KINTEX VR UI Metrics Collection & Comparison", () => {
  const ORIGIN_URL = "https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko";
  const LOCAL_URL = "http://localhost:5173/";
  const AUDIT_DIR = path.resolve("tests/visual-audit");

  test.beforeAll(async () => {
    await mkdir(AUDIT_DIR, { recursive: true });
  });

  const getMetrics = async (page: any, selector: string, containsText?: string) => {
    return await page.evaluate((args: { sel: string; text?: string }) => {
      let el: Element | null = document.querySelector(args.sel);
      if (args.text) {
        const els = document.querySelectorAll(args.sel);
        el = null;
        for (const candidate of Array.from(els)) {
          if (candidate.textContent && candidate.textContent.includes(args.text)) {
            el = candidate;
            break;
          }
        }
      }
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        selector: args.sel,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: style.zIndex,
        opacity: style.opacity,
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        borderRadius: style.borderRadius,
        pointerEvents: style.pointerEvents
      };
    }, { sel: selector, text: containsText });
  };

  test("1. 원본 사이트 UI Metrics 수집", async ({ page }) => {
    try {
      await page.goto(ORIGIN_URL, { timeout: 30000 });
      await page.waitForTimeout(4000);

      // 원본 핵심 UI 요소들 선택
      const targets = [
        { key: "header", sel: "header" },
        { key: "logo", sel: "#panorama-logo" },
        { key: "title", sel: ".title-text" },
        { key: "langSelect", sel: "#langSelect" },
        { key: "mapBtn", sel: ".panorama-map" }
      ];

      const metrics: Record<string, any> = {};
      for (const item of targets) {
        metrics[item.key] = await getMetrics(page, item.sel);
      }

      await writeFile(
        path.join(AUDIT_DIR, "origin-ui-metrics.json"),
        JSON.stringify(metrics, null, 2),
        "utf8"
      );
    } catch (e) {
      console.warn("Skip original metrics collection (offline or timeout).");
    }
  });

  test("2. 로컬 사이트 UI Metrics 수집", async ({ page }) => {
    // 튜토리얼 스킵
    await page.addInitScript(() => {
      window.localStorage.setItem("kmice_hide_tutorial", "1");
    });

    await page.goto(LOCAL_URL);
    await page.waitForTimeout(2000);

    const targets = [
      { key: "header", sel: "header" },
      { key: "logo", sel: "header img" },
      { key: "title", sel: "header div.text-white" },
      { key: "langSelect", sel: "button", text: "KOR" },
      { key: "mapBtn", sel: "button", text: "1-1F" }
    ];

    const metrics: Record<string, any> = {};
    for (const item of targets) {
      metrics[item.key] = await getMetrics(page, item.sel, item.text);
    }

    await writeFile(
      path.join(AUDIT_DIR, "local-ui-metrics.json"),
      JSON.stringify(metrics, null, 2),
      "utf8"
    );
  });

  test("3. 수집 결과 차이 대조 보고서 생성", async () => {
    try {
      const originData = JSON.parse(await readFile(path.join(AUDIT_DIR, "origin-ui-metrics.json"), "utf8"));
      const localData = JSON.parse(await readFile(path.join(AUDIT_DIR, "local-ui-metrics.json"), "utf8"));

      const report: Record<string, any> = {
        timestamp: new Date().toISOString(),
        diffs: {}
      };

      for (const key of Object.keys(originData)) {
        const o = originData[key];
        const l = localData[key];
        if (o && l) {
          report.diffs[key] = {
            widthDiff: Math.abs(o.width - l.width),
            heightDiff: Math.abs(o.height - l.height),
            xDiff: Math.abs(o.x - l.x),
            yDiff: Math.abs(o.y - l.y),
            zIndexDiff: o.zIndex !== l.zIndex ? `${o.zIndex} vs ${l.zIndex}` : "same"
          };
        }
      }

      await writeFile(
        path.join(AUDIT_DIR, "ui-diff-report.json"),
        JSON.stringify(report, null, 2),
        "utf8"
      );
    } catch (e) {
      console.warn("Could not generate diff report due to missing metric files.");
    }
  });
});
