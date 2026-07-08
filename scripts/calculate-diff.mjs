import * as THREE from 'three';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// krpano uses various FOV types. Assuming krpano uses VFOV=90 or MFOV=90.
// If MFOV=120 (common krpano default), on 1280x720 (aspect 1.777),
// Horizontal is 120. Vertical FOV = 2 * atan(tan(60 deg) / 1.777) = 2 * atan(1.732 / 1.777) = 88.5 deg.
// Let's assume origin krpano VFOV is ~90, local Threejs VFOV is 75.
const width = 1280;
const height = 720;
const aspect = width / height;

function project(fov, hlookat, vlookat, isKrpano = false) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.set(0, 0, 0);
  
  // start coordinates
  const startLon = 350;
  const startLat = -5;
  const phi = THREE.MathUtils.degToRad(90 - startLat);
  const theta = THREE.MathUtils.degToRad(startLon);
  const target = new THREE.Vector3(
    -500 * Math.sin(phi) * Math.sin(theta),
    500 * Math.cos(phi),
    -500 * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();

  const hphi = THREE.MathUtils.degToRad(90 - vlookat);
  const htheta = THREE.MathUtils.degToRad(hlookat);
  const hp = new THREE.Vector3(
    -480 * Math.sin(hphi) * Math.sin(htheta),
    480 * Math.cos(hphi),
    -480 * Math.sin(hphi) * Math.cos(htheta)
  );

  hp.project(camera);
  const sx = (hp.x * 0.5 + 0.5) * width;
  const sy = (-hp.y * 0.5 + 0.5) * height;
  return { x: Math.round(sx), y: Math.round(sy) };
}

// Markers from scenes.ts (aerial01)
const markers = [
  { id: 'aerial01-h1', label: 'Gate1A', lon: 333.69, lat: -23.53 },
  { id: 'aerial01-h2', label: 'Gate2', lon: 348.57, lat: -22.9 },
  { id: 'SIC2027 KINTEX1', label: '제1전시장', lon: 310, lat: -15 }, // approx SIC27-KINTEX pin
];

const report = markers.map(m => {
  // Origin uses krpano FOV ~90, Local uses Three FOV 75.
  // Origin also scales markers.
  const origin = project(90, m.lon, m.lat, true);
  const local = project(75, m.lon, m.lat, false);
  
  return {
    label: m.label,
    origin_x: origin.x,
    origin_y: origin.y,
    local_x: local.x,
    local_y: local.y,
    diff_x: local.x - origin.x,
    diff_y: local.y - origin.y,
    error: "Mathematical diff due to FOV 75 vs 90"
  };
});

const outputDir = join(__dirname, '../tests/visual-audit/aerial01');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const reportPath = join(outputDir, 'aerial01-marker-position-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("Saved mathematical position report.");
