import { test, expect } from "@playwright/test";

test("sandbox test", async () => {
  console.log("Starting fetch from Playwright test...");
  const r = await fetch("https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko");
  console.log("Fetch ok, status:", r.status);
  expect(r.status).toBe(200);
});
