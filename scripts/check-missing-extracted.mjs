import fs from "fs";

const meta = JSON.parse(fs.readFileSync("public/panos/meta.json", "utf8"));
const extracted = JSON.parse(fs.readFileSync("extracted_scenes.json", "utf8"));
const extractedKeys = new Set(extracted.map(s => s.key));

console.log("Checking for hotspots in meta.json pointing to keys missing in extracted_scenes.json...");

let count = 0;
for (const s of meta) {
  const isSourceInExtracted = extractedKeys.has(s.key);
  if (!isSourceInExtracted) continue; // skip source if not in extracted anyway
  
  for (const h of s.hotspots || []) {
    if (h.kind === "nav" && h.target) {
      if (!extractedKeys.has(h.target)) {
        console.log(`[Missing from extracted_scenes.json] Source: ${s.key} (${s.title}) -> Hotspot: "${h.name}" -> Target: "${h.target}" (Exists in meta.json but missing in extracted_scenes.json)`);
        count++;
      }
    }
  }
}

console.log(`Found ${count} missing extracted links.`);
