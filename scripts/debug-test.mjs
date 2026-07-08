const payload = JSON.stringify({
  keys: ["scene_2478", "scene_2479", "scene_2480", "scene_2482"]
});

console.log("Sending POST to local dev server...");
const r = await fetch("http://127.0.0.1:5173/__hotspot-editor/build-panos", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: payload
});

console.log("Response status:", r.status);
const text = await r.text();
console.log("Response body:", text);
