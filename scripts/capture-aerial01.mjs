import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const outputDir = join(__dirname, '../tests/visual-audit/aerial01');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  console.log("Navigating to origin...");
  await page.goto('https://k-mice.visitkorea.or.kr/vr/sites/KIN.kto?lang=ko', { waitUntil: 'networkidle', timeout: 60000 });
  
  // wait for krpano to load and render
  await page.waitForTimeout(8000);

  // origin screenshot
  const originPath = join(outputDir, 'origin.png');
  await page.screenshot({ path: originPath });
  console.log("Saved origin.png");

  // Extract origin hotspots
  // Krpano creates <div> elements for hotspots. We can query them by looking at their internal img src or styles.
  // Origin uses:
  // - Orange marker: /mice/upload/mice_vr/marker/marker01.png or marker07.png
  // - SIC27-KINTEX 1 pin: /mice/upload/mice_vr/KIN/air/kor/SIC2027 KINTEX01.png
  // - SIC27-KINTEX 2 pin: /mice/upload/mice_vr/KIN/air/kor/SIC2027 KINTEX02.png

  const originMarkers = await page.evaluate(() => {
    const markers = [];
    const elements = document.querySelectorAll('div, img');
    
    for (const el of elements) {
      let src = '';
      if (el.tagName === 'IMG') {
        src = el.src || '';
      } else {
        const bg = el.style.backgroundImage;
        if (bg) src = bg;
      }
      
      let type = '';
      let label = '';
      
      if (src.includes('marker01.png') || src.includes('marker07.png')) {
        type = 'orange_marker';
      } else if (src.includes('SIC2027 KINTEX01.png')) {
        type = 'SIC2027 KINTEX1_pin';
        label = '제1전시장';
      } else if (src.includes('SIC2027 KINTEX02.png')) {
        type = 'SIC2027 KINTEX2_pin';
        label = '제2전시장';
      }
      
      if (type) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // get the center x, y
          markers.push({
            type,
            label,
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            width: rect.width,
            height: rect.height,
            visible: true
          });
        }
      }
    }
    return markers;
  });

  console.log("Origin markers extracted:", originMarkers.length);

  console.log("Navigating to local...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  const localPath = join(outputDir, 'local-before.png');
  await page.screenshot({ path: localPath });
  console.log("Saved local-before.png");

  const localMarkers = await page.evaluate(() => {
    const markers = [];
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const img = btn.querySelector('img');
      if (!img) continue;
      const src = img.src || '';
      
      let type = '';
      let label = btn.innerText || '';
      
      if (src.includes('marker01.png') || src.includes('marker07.png')) {
        type = 'orange_marker';
      } else if (src.includes('SIC2027 KINTEX01.png')) {
        type = 'SIC2027 KINTEX1_pin';
      } else if (src.includes('SIC2027 KINTEX02.png')) {
        type = 'SIC2027 KINTEX2_pin';
      }
      
      if (type) {
        const rect = img.getBoundingClientRect(); // Use the image rect for accuracy
        if (rect.width > 0 && rect.height > 0) {
          markers.push({
            type,
            label: label.trim(),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible: true
          });
        }
      }
    }
    return markers;
  });

  console.log("Local markers extracted:", localMarkers.length);

  // Match and generate report
  const report = [];
  
  // Try to match by type and rough position (since labels might differ or be empty on origin)
  for (const orig of originMarkers) {
    // Find closest local marker of same type
    let closest = null;
    let minDist = Infinity;
    for (const loc of localMarkers) {
      if (loc.type === orig.type) {
        const dist = Math.sqrt(Math.pow(orig.x - loc.x, 2) + Math.pow(orig.y - loc.y, 2));
        if (dist < minDist) {
          minDist = dist;
          closest = loc;
        }
      }
    }
    
    if (closest) {
      report.push({
        type: orig.type,
        label: orig.label || closest.label,
        origin_x: orig.x,
        origin_y: orig.y,
        local_x: closest.x,
        local_y: closest.y,
        diff_x: closest.x - orig.x,
        diff_y: closest.y - orig.y,
        origin_width: orig.width,
        origin_height: orig.height,
        local_width: closest.width,
        local_height: closest.height,
        distance: Math.round(minDist)
      });
      // remove from local to avoid duplicate matching
      localMarkers.splice(localMarkers.indexOf(closest), 1);
    } else {
      report.push({
        type: orig.type,
        label: orig.label,
        origin_x: orig.x,
        origin_y: orig.y,
        local_x: null,
        local_y: null,
        error: "Missing in local"
      });
    }
  }

  for (const loc of localMarkers) {
    report.push({
      type: loc.type,
      label: loc.label,
      origin_x: null,
      origin_y: null,
      local_x: loc.x,
      local_y: loc.y,
      error: "Extra in local"
    });
  }

  const reportPath = join(outputDir, 'aerial01-marker-position-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("Saved report.");

  await browser.close();
}

run().catch(console.error);
