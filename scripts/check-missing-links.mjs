import fs from "fs";

const meta = JSON.parse(fs.readFileSync("public/panos/meta.json", "utf8"));
const sceneKeys = new Set(meta.map(s => s.key));

console.log("Checking for hotspots in meta.json pointing to non-existent scene keys...");

let count = 0;
for (const s of meta) {
  for (const h of s.hotspots || []) {
    if (h.kind === "nav" && h.target) {
      if (!sceneKeys.has(h.target)) {
        console.log(`[Broken Link] Source: ${s.key} (${s.title}) -> Hotspot: "${h.name}" -> Target: "${h.target}" (Does not exist in meta.json)`);
        count++;
      }
    }
  }
}

console.log(`Found ${count} broken links.`);
