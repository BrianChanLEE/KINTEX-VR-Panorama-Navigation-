// Build high-resolution equirectangular panoramas + scene metadata for the
// SIC27-KINTEX VR clone by pulling the original krpano cube tiles, stitching the six
// faces, and reprojecting cube -> equirect. Run: `bun scripts/build-panos.mjs [key]`
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://k-mice.visitkorea.or.kr";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const LEVELS = (process.env.LEVELS || "l4,l3,l2")
  .split(",")
  .map((level) => level.trim())
  .filter(Boolean);
const OUT_W = Number(process.env.OUT_W || 12288);
const OUT_H = OUT_W / 2;
const OUT_DIR = path.resolve("public/panos");
const FACES = ["f", "b", "l", "r", "u", "d"];

import { existsSync, readFileSync } from "node:fs";
const SCENES = JSON.parse(readFileSync(path.resolve("extracted_scenes.json"), "utf8"));
const ID2KEY = Object.fromEntries(SCENES.map((s) => [s.id, s.key]));

let COOKIE = "";
async function session() {
  const r = await fetch(`${BASE}/vr/sites/KIN.kto?lang=ko`, { headers: { "User-Agent": UA } });
  const sc = r.headers.get("set-cookie") || "";
  COOKIE = (sc.match(/JSESSIONID=[^;]+/) || [""])[0];
  if (!COOKIE) throw new Error("no session cookie");
}

async function sceneJson(id) {
  const ref = `${BASE}/vr/scenes/${id}.kto?lang=ko`;
  const r = await fetch(`${BASE}/vr/scenes/${id}.kto?time=${Date.now()}&lang=ko`, {
    headers: {
      "User-Agent": UA, Accept: "application/json",
      "Content-Type": "application/json", Cookie: COOKIE, Referer: ref,
    },
  });
  const j = await r.json();
  return JSON.parse(j.sceneData);
}

async function getTile(folder, face, level, v, h, ref) {
  const url = `${BASE}${folder}/${face}/${level}/${v}/${level}_${face}_${v}_${h}.jpg`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: COOKIE, Referer: ref },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

// stitch one cube face from its tile grid -> {data,w,h} raw RGB
async function buildFace(folder, face, level, ref) {
  // detect grid size
  let cols = 0;
  for (let h = 1; h <= 16; h++) {
    const t = await getTile(folder, face, level, 1, h, ref);
    if (!t) break;
    cols++;
  }
  let rows = 0;
  for (let v = 1; v <= 16; v++) {
    const t = await getTile(folder, face, level, v, 1, ref);
    if (!t) break;
    rows++;
  }
  if (cols === 0 || rows === 0) throw new Error(`no tiles for face ${face}`);

  // download all tiles in parallel
  const coords = [];
  for (let v = 1; v <= rows; v++) for (let h = 1; h <= cols; h++) coords.push({ v, h });
  const bufs = await Promise.all(coords.map((c) => getTile(folder, face, level, c.v, c.h, ref)));

  const parts = [];
  let faceW = 0;
  let faceH = 0;
  for (let k = 0; k < coords.length; k++) {
    const buf = bufs[k];
    if (!buf) continue;
    const meta = await sharp(buf).metadata();
    const left = (coords[k].h - 1) * 512;
    const top = (coords[k].v - 1) * 512;
    parts.push({ input: buf, left, top });
    faceW = Math.max(faceW, left + (meta.width || 512));
    faceH = Math.max(faceH, top + (meta.height || 512));
  }
  const composed = await sharp({
    create: { width: faceW, height: faceH, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite(parts)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: composed.data, w: composed.info.width, h: composed.info.height };
}

// cube -> equirect (standard OpenGL cube mapping; lon=0 at front face centre)
function toEquirect(faces) {
  const out = Buffer.alloc(OUT_W * OUT_H * 3);
  const sample = (f, s, t) => {
    const px = Math.min(f.w - 1, Math.max(0, Math.round(s * (f.w - 1))));
    const py = Math.min(f.h - 1, Math.max(0, Math.round(t * (f.h - 1))));
    const idx = (py * f.w + px) * 3;
    return idx;
  };
  for (let j = 0; j < OUT_H; j++) {
    const lat = (0.5 - (j + 0.5) / OUT_H) * Math.PI; // +pi/2 .. -pi/2
    const cl = Math.cos(lat);
    const y = Math.sin(lat);
    for (let i = 0; i < OUT_W; i++) {
      const lon = ((i + 0.5) / OUT_W - 0.5) * 2 * Math.PI; // -pi..pi, 0 centre
      const x = cl * Math.sin(lon);
      const z = cl * Math.cos(lon); // lon=0 -> +z (front)
      const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
      let f, sc, tc, ma;
      if (az >= ax && az >= ay) {
        if (z > 0) { f = faces.f; sc = x; tc = -y; ma = az; }
        else { f = faces.b; sc = -x; tc = -y; ma = az; }
      } else if (ax >= ay) {
        if (x > 0) { f = faces.r; sc = -z; tc = -y; ma = ax; }
        else { f = faces.l; sc = z; tc = -y; ma = ax; }
      } else {
        if (y > 0) { f = faces.u; sc = x; tc = z; ma = ay; }
        else { f = faces.d; sc = x; tc = -z; ma = ay; }
      }
      const s = (sc / ma + 1) / 2;
      const t = (tc / ma + 1) / 2;
      const sIdx = sample(f, s, t);
      const o = (j * OUT_W + i) * 3;
      out[o] = f.data[sIdx];
      out[o + 1] = f.data[sIdx + 1];
      out[o + 2] = f.data[sIdx + 2];
    }
  }
  return out;
}

const norm = (d) => ((d % 360) + 360) % 360;

function mapHotspots(hotspots) {
  return (hotspots || [])
    .map((h) => {
      const act = h.actions?.onClick || {};
      const kind = act.kind === "CHANGE_SCENE" && ID2KEY[act.sceneId] ? "nav" : "poi";
      return {
        id: String(h.id),
        name: h.name || "",
        url: h.url || "",
        lon: norm(h.hDeg || 0), // krpano ath (+right) -> our lon
        lat: -(h.vDeg || 0), // krpano atv (+down) -> our lat (+up)
        kind,
        target: kind === "nav" ? ID2KEY[act.sceneId] : undefined,
        desc: h.description || "",
      };
    })
    .filter((h) => h.kind !== "nav" || h.target); // drop nav to scenes we don't include
}

async function writePlaceholderPano(filePath, title) {
  const background = sharp({
    create: {
      width: OUT_W,
      height: OUT_H,
      channels: 3,
      background: { r: 13, g: 21, b: 29 },
    },
  });

  const overlay = Buffer.from(`
    <svg width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${OUT_W} ${OUT_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(13,21,29,1)"/>
      <circle cx="${OUT_W / 2}" cy="${OUT_H / 2 - 120}" r="180" fill="#1f2937" opacity="0.8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="96" font-family="Arial, sans-serif" font-weight="700">
        ${title || "Panorama"}
      </text>
      <text x="50%" y="50%" dy="130" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-size="54" font-family="Arial, sans-serif">
        Source panorama unavailable
      </text>
    </svg>
  `);

  await background
    .composite([{ input: overlay }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(filePath);
}

async function run() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  await mkdir(OUT_DIR, { recursive: true });
  await session();
  // merge into any existing meta so batched runs accumulate
  const metaPath = path.join(OUT_DIR, "meta.json");
  let meta = [];
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8"));
  } catch {
    meta = [];
  }
  const upsert = (row) => {
    const i = meta.findIndex((m) => m.key === row.key);
    if (i >= 0) meta[i] = row;
    else meta.push(row);
  };

  const detectLevel = async (folder, ref) => {
    for (const level of LEVELS) {
      let hasAllFaces = true;
      for (const face of FACES) {
        const tile = await getTile(folder, face, level, 1, 1, ref);
        if (!tile) {
          hasAllFaces = false;
          break;
        }
      }
      if (hasAllFaces) return level;
    }
    return null;
  };

  for (const sc of SCENES) {
    if (only.length && !only.includes(sc.key)) continue;
    const checkPath = path.join(OUT_DIR, `${sc.key}.jpg`);
    const ref = `${BASE}/vr/scenes/${sc.id}.kto?lang=ko`;
    
    let data;
    try {
      data = await sceneJson(sc.id);
    } catch (err) {
      console.error(`Failed to fetch scene data for ${sc.key}:`, err);
      continue;
    }

    const folder = String(data.mediaInfo.mediaUrl || "").trim();
    const selectedLevel = await detectLevel(folder, ref);
    if (!selectedLevel) {
      console.warn(`[${sc.key}] No complete tile level found. Writing placeholder panorama.`);
      await writePlaceholderPano(checkPath, data.title);
      upsert({
        key: sc.key,
        zone: sc.zone,
        title: data.title,
        desc: data.desc || "",
        startLon: norm(data.startAngle?.hDeg || 0),
        startLat: -(data.startAngle?.vDeg || 0),
        generalInfo: data.generalInfo || "",
        hotspots: mapHotspots(data.hotspots),
      });
      await writeFile(metaPath, JSON.stringify(meta, null, 2));
      continue;
    }
    const shouldRebuild = async () => {
      if (!existsSync(checkPath)) return true;
      const meta = await sharp(checkPath).metadata();
      return meta.width !== OUT_W || meta.height !== OUT_H;
    };

    const rebuild = await shouldRebuild();
    if (rebuild) {
      process.stdout.write(`\n[${sc.key}] ${data.title} (${folder}) level=${selectedLevel} `);
      try {
        const faces = {};
        for (const face of FACES) {
          faces[face] = await buildFace(folder, face, selectedLevel, ref);
          process.stdout.write(`${face}${faces[face].w} `);
        }
        const eq = toEquirect(faces);
        await sharp(eq, { raw: { width: OUT_W, height: OUT_H, channels: 3 } })
          .jpeg({ quality: 82, mozjpeg: true })
          .toFile(checkPath);
        process.stdout.write(`-> ${sc.key}.jpg`);
      } catch (err) {
        console.error(`Stitching failed for ${sc.key}:`, err);
      }
    } else {
      console.log(`[${sc.key}] Image already matches ${OUT_W}x${OUT_H}. Updating metadata only. level=${selectedLevel}`);
    }

    upsert({
      key: sc.key,
      zone: sc.zone,
      title: data.title,
      desc: data.desc || "",
      startLon: norm(data.startAngle?.hDeg || 0),
      startLat: -(data.startAngle?.vDeg || 0),
      generalInfo: data.generalInfo || "",
      hotspots: mapHotspots(data.hotspots),
    });
    await writeFile(metaPath, JSON.stringify(meta, null, 2)); // persist after each scene
  }
  console.log("\n\nDONE. Scenes in meta:", meta.length);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
