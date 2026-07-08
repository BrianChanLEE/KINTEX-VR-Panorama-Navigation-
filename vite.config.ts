import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
              const { sceneKey, hotspotKey, ath, atv, screenX, screenY } = data;
              
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
  plugins: [react(), hotspotEditorPlugin()],
  optimizeDeps: {
    exclude: [
      "same-runtime/dist/jsx-dev-runtime",
      "same-runtime/dist/jsx-runtime",
    ],
  },
});
