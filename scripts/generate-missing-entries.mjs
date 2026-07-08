import fs from "fs";

const BASE = "https://k-mice.visitkorea.or.kr";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

let COOKIE = "";

async function session() {
  console.log("Getting session cookie...");
  const r = await fetch(`${BASE}/vr/sites/KIN.kto?lang=ko`, { headers: { "User-Agent": UA } });
  const sc = r.headers.get("set-cookie") || "";
  COOKIE = (sc.match(/JSESSIONID=[^;]+/) || [""])[0];
  if (!COOKIE) throw new Error("no session cookie");
  console.log(`Session initialized: ${COOKIE}`);
}

async function sceneJson(id) {
  const ref = `${BASE}/vr/scenes/${id}.kto?lang=ko`;
  const r = await fetch(`${BASE}/vr/scenes/${id}.kto?time=${Date.now()}&lang=ko`, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: COOKIE,
      Referer: ref,
    },
  });
  if (!r.ok) {
    throw new Error(`HTTP error! status: ${r.status}`);
  }
  const j = await r.json();
  return JSON.parse(j.sceneData);
}

async function run() {
  const SCENES = JSON.parse(fs.readFileSync("extracted_scenes.json", "utf8"));
  const ID2KEY = Object.fromEntries(SCENES.map((s) => [s.id, s.key]));

  try {
    await session();
  } catch (err) {
    console.error(`Session initialization failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`Checking ${SCENES.length} scenes for missing nav targets...`);

  const missingSet = new Map();

  for (const sc of SCENES) {
    try {
      const data = await sceneJson(sc.id);
      const hotspots = data.hotspots || [];
      
      for (const h of hotspots) {
        const act = h.actions?.onClick || {};
        if (act.kind === "CHANGE_SCENE") {
          const targetId = act.sceneId;
          if (!ID2KEY[targetId] && !missingSet.has(targetId)) {
            missingSet.set(targetId, {
              sourceKey: sc.key,
              sourceZone: sc.zone,
              groupName: sc.groupName,
              label: h.name
            });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to check ${sc.key}: ${err.message}`);
    }
  }

  console.log(`Found ${missingSet.size} missing target scene IDs. Fetching titles...`);

  const newEntries = [];
  for (const [targetId, info] of missingSet.entries()) {
    try {
      const data = await sceneJson(targetId);
      newEntries.push({
        key: `scene_${targetId}`,
        id: targetId,
        zone: info.sourceZone,
        name: data.title || info.label,
        groupName: info.groupName
      });
      console.log(`Fetched target ${targetId}: "${data.title || info.label}"`);
    } catch (err) {
      console.error(`Failed to fetch title for ${targetId}: ${err.message}`);
    }
  }

  fs.writeFileSync("missing_entries.json", JSON.stringify(newEntries, null, 2), "utf8");
  console.log("\nDone! Generated entries saved to missing_entries.json");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
