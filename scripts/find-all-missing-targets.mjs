import fs from "fs";

const SCENES = JSON.parse(fs.readFileSync("extracted_scenes.json", "utf8"));
const ID2KEY = Object.fromEntries(SCENES.map((s) => [s.id, s.key]));

console.log(`Checking ${SCENES.length} scenes for missing nav targets...`);

for (const sc of SCENES) {
  const url = `https://k-mice.visitkorea.or.kr/vr/scenes/${sc.id}.kto?lang=ko`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[${sc.key}] HTTP ${res.status}`);
      continue;
    }
    const raw = await res.json();
    const data = JSON.parse(raw.sceneData);
    const hotspots = data.hotspots || [];
    
    for (const h of hotspots) {
      const act = h.actions?.onClick || {};
      if (act.kind === "CHANGE_SCENE") {
        const targetId = act.sceneId;
        if (!ID2KEY[targetId]) {
          console.log(`[MISSING] Source: ${sc.key} (${sc.name}) -> Hotspot: "${h.name}" (ID: ${h.id}) -> Target Scene ID: ${targetId}`);
        }
      }
    }
  } catch (err) {
    console.error(`[${sc.key}] Error: ${err.message}`);
  }
}
console.log("Done checking.");
