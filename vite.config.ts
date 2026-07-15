import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
// @ts-ignore
import fs from "node:fs";
// @ts-ignore
import path from "node:path";

declare const process: {
  cwd: () => string;
};

function hotspotEditorPlugin() {
  return {
    name: 'hotspot-editor-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method === 'POST' && req.url === '/__hotspot-editor/save') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sceneKey, hotspotKey, ath, atv, screenX, screenY, patch } = data;

              if (!sceneKey || !hotspotKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing sceneKey or hotspotKey" }));
                return;
              }

              const overridesPath = path.resolve(process.cwd(), 'src/data/hotspot-position-overrides.json');
              const backupPath = path.resolve(process.cwd(), 'src/data/hotspot-position-overrides.backup.json');

              let overrides: Record<string, any> = {};
              if (fs.existsSync(overridesPath)) {
                try {
                  overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
                } catch (e) {
                  // Ignore parse error
                }
              }

              // Backup before modifying
              if (Object.keys(overrides).length > 0) {
                fs.writeFileSync(backupPath, JSON.stringify(overrides, null, 2));
              }

              if (!overrides[sceneKey]) {
                overrides[sceneKey] = {};
              }

              overrides[sceneKey][hotspotKey] = {
                ...(patch || {}),
                ath: Number(ath.toFixed(2)),
                atv: Number(atv.toFixed(2)),
                screenOffsetX: screenX ? Number(screenX.toFixed(2)) : 0,
                screenOffsetY: screenY ? Number(screenY.toFixed(2)) : 0,
                updatedAt: new Date().toISOString()
              };

              fs.mkdirSync(path.dirname(overridesPath), { recursive: true });
              fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, overrides }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'POST' && req.url === '/__hotspot-editor/add') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sceneId, label, labelEn, kind, type, target, sub, ath, atv } = data;

              if (!sceneId || !label) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing sceneId or label" }));
                return;
              }

              const addedPath = path.resolve(process.cwd(), 'src/data/added-hotspots.json');
              const backupPath = path.resolve(process.cwd(), 'src/data/added-hotspots.backup.json');

              let added: Record<string, any> = {};
              if (fs.existsSync(addedPath)) {
                try {
                  added = JSON.parse(fs.readFileSync(addedPath, 'utf-8'));
                } catch (e) {
                  // Ignore
                }
              }

              // Backup
              if (Object.keys(added).length > 0) {
                fs.writeFileSync(backupPath, JSON.stringify(added, null, 2));
              }

              if (!added[sceneId]) {
                added[sceneId] = [];
              }

              const newHotspot = {
                id: `added-${sceneId}-${Date.now()}`,
                lon: Number((ath ?? 0).toFixed(2)),
                lat: Number((atv ?? 0).toFixed(2)),
                label,
                labelEn: labelEn || label,
                kind: kind || "poi",
                type: type || "custom",
                target: target || undefined,
                sub: sub || undefined,
                url: type === "toilet" ? "/mice/upload/mice_vr/marker/toilet.png" // placeholder/marker path matching presets
                  : type === "convenience" ? "/mice/upload/mice_vr/marker/Convenience.png"
                    : type === "cafe" ? "/mice/upload/mice_vr/marker/cafe.png"
                      : type === "elevator" ? "/mice/upload/mice_vr/marker/Elevator.png"
                        : type === "info" ? "/mice/upload/mice_vr/marker/Info.png"
                          : "/mice/upload/mice_vr/marker/nav.png"
              };

              added[sceneId].push(newHotspot);

              fs.mkdirSync(path.dirname(addedPath), { recursive: true });
              fs.writeFileSync(addedPath, JSON.stringify(added, null, 2));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, addedHotspots: added }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'POST' && req.url === '/__hotspot-editor/delete') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sceneId, hotspotId } = data;

              if (!sceneId || !hotspotId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing sceneId or hotspotId" }));
                return;
              }

              const addedPath = path.resolve(process.cwd(), 'src/data/added-hotspots.json');
              const backupPath = path.resolve(process.cwd(), 'src/data/added-hotspots.backup.json');

              if (fs.existsSync(addedPath)) {
                let added: Record<string, any> = {};
                try {
                  added = JSON.parse(fs.readFileSync(addedPath, 'utf-8'));
                } catch (e) {
                  // Ignore
                }

                if (added[sceneId]) {
                  // Backup first
                  fs.writeFileSync(backupPath, JSON.stringify(added, null, 2));

                  added[sceneId] = added[sceneId].filter((h: any) => h.id !== hotspotId);
                  if (added[sceneId].length === 0) {
                    delete added[sceneId];
                  }
                  fs.writeFileSync(addedPath, JSON.stringify(added, null, 2));
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, addedHotspots: added }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Added hotspots file not found" }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'POST' && req.url === '/__hotspot-editor/reset') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sceneKey, hotspotKey } = data;

              if (!sceneKey || !hotspotKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing sceneKey or hotspotKey" }));
                return;
              }

              const overridesPath = path.resolve(process.cwd(), 'src/data/hotspot-position-overrides.json');
              const backupPath = path.resolve(process.cwd(), 'src/data/hotspot-position-overrides.backup.json');

              if (fs.existsSync(overridesPath)) {
                let overrides: Record<string, any> = {};
                try {
                  overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
                } catch (e) {
                  // Ignore
                }

                if (overrides[sceneKey] && overrides[sceneKey][hotspotKey]) {
                  // Backup first
                  fs.writeFileSync(backupPath, JSON.stringify(overrides, null, 2));

                  delete overrides[sceneKey][hotspotKey];
                  if (Object.keys(overrides[sceneKey]).length === 0) {
                    delete overrides[sceneKey];
                  }
                  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2));
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, overrides }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Overrides file not found" }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'POST' && req.url === '/__hotspot-editor/build-panos') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { keys } = data;

              if (!keys || !Array.isArray(keys)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing keys array" }));
                return;
              }

              // @ts-ignore
              import('child_process').then(({ exec }) => {
                const cmd = `node scripts/build-panos.mjs ${keys.join(' ')}`;
                exec(cmd, { cwd: process.cwd() }, (err: any, stdout: any, stderr: any) => {
                  if (err) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: err.message, stderr }));
                  } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, stdout, stderr }));
                  }
                });
              }).catch((err) => {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), basicSsl(), hotspotEditorPlugin()],
  optimizeDeps: {
    exclude: ["same-runtime"],
  },
});
