import fs from "fs";

const mapData = JSON.parse(fs.readFileSync("public/panos/origin-scene-adjacency-map.json", "utf8"));
const scenes = mapData.scenes;

const keyToScene = {};
for (const s of scenes) {
  keyToScene[s.sceneKey] = s;
}

console.log("Checking C1 to C2 connections in origin-scene-adjacency-map.json...");

for (const s of scenes) {
  const sZone = s.zone || "";
  const isC1 = sZone.startsWith("floor1");
  const isC2 = sZone.startsWith("floor2");
  
  for (const adj of s.adjacentScenes) {
    const targetKey = adj.target;
    const targetScene = keyToScene[targetKey];
    if (!targetScene) continue;
    
    const tZone = targetScene.zone || "";
    const isTargetC1 = tZone.startsWith("floor1");
    const isTargetC2 = tZone.startsWith("floor2");
    
    if (isC1 && isTargetC2) {
      console.log(`[Direct Connection] ${s.sceneKey} (${s.title}, zone: ${sZone}) -> ${targetKey} (${targetScene.title}, zone: ${tZone})`);
    }
    if (sZone === "movingwalk" || tZone === "movingwalk") {
      console.log(`[Movingwalk Connection] ${s.sceneKey} (${s.title}, zone: ${sZone}) -> ${targetKey} (${targetScene.title}, zone: ${tZone})`);
    }
  }
}
