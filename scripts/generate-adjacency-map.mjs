import fs from "node:fs";

const meta = JSON.parse(fs.readFileSync("public/panos/meta.json", "utf8"));
const extracted = JSON.parse(fs.readFileSync("extracted_scenes.json", "utf8"));

const keyToExtracted = {};
for (const item of extracted) {
  keyToExtracted[item.key] = item;
}

// Map degrees (lon) to cardinal direction
function getCardinalDirection(lon) {
  const normalized = ((lon % 360) + 360) % 360;
  
  if (normalized >= 337.5 || normalized < 22.5) return "North";
  if (normalized >= 22.5 && normalized < 67.5) return "North-East";
  if (normalized >= 67.5 && normalized < 112.5) return "East";
  if (normalized >= 112.5 && normalized < 157.5) return "South-East";
  if (normalized >= 157.5 && normalized < 202.5) return "South";
  if (normalized >= 202.5 && normalized < 247.5) return "South-West";
  if (normalized >= 247.5 && normalized < 292.5) return "West";
  return "North-West";
}

const targetScenes = [];
const processedKeys = new Set();

for (const s of meta) {
  if (processedKeys.has(s.key)) continue;
  
  const ext = keyToExtracted[s.key];
  if (!ext) continue;

  // Filter only scenes that have nav hotspots
  const navHotspots = (s.hotspots || []).filter(h => h.kind === "nav" && h.target);
  if (navHotspots.length === 0) {
    continue;
  }

  // Create adjacentScenes
  const adjacentScenes = navHotspots.map(h => {
    const targetExt = keyToExtracted[h.target];
    const label = targetExt ? targetExt.name : h.name || h.target;
    
    return {
      label: label,
      target: h.target,
      direction: getCardinalDirection(h.lon)
    };
  });

  targetScenes.push({
    sceneKey: s.key,
    originalSceneId: ext.id,
    title: ext.name || s.title,
    zone: ext.zone || s.zone,
    startDirection: {
      hDeg: Math.round(s.startLon || 0),
      vDeg: Math.round(s.startLat || 0)
    },
    adjacentScenes: adjacentScenes
  });
  processedKeys.add(s.key);
}

const registry = {
  comment: "Scene and hotspot adjacency mapping registry",
  scenes: targetScenes
};

fs.writeFileSync("public/panos/origin-scene-adjacency-map.json", JSON.stringify(registry, null, 2), "utf8");
console.log(`Successfully generated adjacency map with ${targetScenes.length} scenes.`);
