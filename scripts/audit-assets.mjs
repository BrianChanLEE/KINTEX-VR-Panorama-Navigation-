import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = process.cwd();
const reportDir = path.join(rootDir, "reports");
const reportJsonPath = path.join(reportDir, "asset-audit.json");
const reportMdPath = path.join(reportDir, "asset-audit.md");
const devBaseUrl = process.env.ASSET_AUDIT_BASE_URL || "http://127.0.0.1:4173";

const sourceGlobs = [
  "src",
  "public/panos",
  "public/mice",
];

const assetPattern = /(?:["'`])((?:https?:\/\/|\/|\.{1,2}\/)[^"'`<>]+\.(?:png|jpe?g|gif|webp|svg|json|bmp|ico|avif))(?:["'`])/gi;

function walk(dir, predicate = () => true, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === ".git" || entry.name === "node_modules") continue;
      walk(fullPath, predicate, results);
      continue;
    }

    if (predicate(fullPath)) results.push(fullPath);
  }

  return results;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function uniqueByKey(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function classifyUrl(url) {
  if (/^https?:\/\//i.test(url)) return "B";
  if (/^\/(mice|panos)\//i.test(url)) return "C";
  if (url.startsWith("/")) return "A";
  if (/^[a-z]+:\/\//i.test(url)) return "B";
  return "D";
}

function guessExpectedFile(url) {
  if (/^https?:\/\//i.test(url)) return "(remote)";
  const cleanPath = url.split(/[?#]/)[0];
  return path.join(rootDir, "public", cleanPath.replace(/^\//, ""));
}

function isTextHtml(buffer) {
  const head = buffer.subarray(0, 256).toString("utf8").toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

function detectMime(buffer, filePath) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return "image/gif";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.length > 0 && isTextHtml(buffer)) {
    return "text/html";
  }
  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

async function fetchRemote(url) {
  if (typeof fetch !== "function") return null;
  const response = await fetch(url, { method: "GET" });
  const contentType = response.headers.get("content-type") || "";
  const contentLength = response.headers.get("content-length") || "";
  return {
    status: response.status,
    finalUrl: response.url,
    contentType,
    contentLength: Number(contentLength || 0),
  };
}

function collectReferences() {
  const files = sourceGlobs.flatMap((dir) =>
    walk(path.join(rootDir, dir), (file) => {
      const ext = path.extname(file).toLowerCase();
      return [".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".json", ".mjs"].includes(ext);
    }),
  );

  const refs = [];

  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(assetPattern)) {
      const url = match[1];
      const urlPath = url.split(/[?#]/)[0];
      if (/^\.\.?\//.test(url) && urlPath.endsWith(".json")) continue;
      const line = getLineNumber(text, match.index ?? 0);
      refs.push({
        file: path.relative(rootDir, file),
        line,
        url,
        kind: classifyUrl(url),
        expectedFile: guessExpectedFile(url),
      });
    }
  }

  return uniqueByKey(refs, (ref) => `${ref.file}:${ref.line}:${ref.url}`);
}

function inspectLocalFile(expectedFile) {
  const exists = fs.existsSync(expectedFile);
  if (!exists) {
    return { exists: false, size: 0, mime: "missing", ok: false, reason: "missing file" };
  }

  const stat = fs.statSync(expectedFile);
  if (stat.size === 0) {
    return { exists: true, size: 0, mime: "empty", ok: false, reason: "zero-byte file" };
  }

  const buffer = fs.readFileSync(expectedFile);
  const mime = detectMime(buffer, expectedFile);
  const ok = mime.startsWith("image/");
  return { exists: true, size: stat.size, mime, ok, reason: ok ? "" : `unexpected mime ${mime}` };
}

async function main() {
  const refs = collectReferences();
  const rows = [];
  const broken = [];

  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i];
    let status = "PASS";
    let actual = "";
    let detail = "";

    if (ref.kind === "B") {
      const remote = await fetchRemote(ref.url);
      if (!remote) {
        status = "FAIL";
        detail = "fetch unavailable";
      } else {
        actual = `${remote.status} ${remote.contentType || "unknown"}`;
        if (remote.status !== 200 || !/^image\//i.test(remote.contentType)) {
          status = "FAIL";
          detail = `remote status=${remote.status} contentType=${remote.contentType}`;
        }
      }
    } else {
      const local = inspectLocalFile(ref.expectedFile);
      actual = `${local.exists ? "exists" : "missing"} ${local.mime}`;
      if (!local.ok) {
        status = "FAIL";
        detail = local.reason;
      }
    }

    if (status === "FAIL") {
      broken.push({ ...ref, detail });
    }

    rows.push({
      번호: i + 1,
      사용파일: ref.file,
      라인: ref.line,
      원본URL: ref.url,
      URL종류: ref.kind,
      예상실제파일: ref.expectedFile,
      상태: status,
      상세: detail,
      실제: actual,
    });
  }

  const summary = {
    total: refs.length,
    pass: rows.filter((row) => row.상태 === "PASS").length,
    fail: rows.filter((row) => row.상태 === "FAIL").length,
    broken,
    rows,
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, JSON.stringify(summary, null, 2));

  const markdown = [
    "# Asset Audit Report",
    "",
    `- Total: ${summary.total}`,
    `- Pass: ${summary.pass}`,
    `- Fail: ${summary.fail}`,
    `- Dev Base URL: ${devBaseUrl}`,
    "",
    "| 번호 | 사용 파일 | 라인 | 원본 URL | URL 종류 | 예상 실제 파일 | 상태 |",
    "|---|---|---:|---|---|---|---|",
    ...rows.map((row) =>
      `| ${row.번호} | ${row.사용파일} | ${row.라인} | ${row.원본URL} | ${row.URL종류} | ${row.예상실제파일} | ${row.상태} |`,
    ),
  ].join("\n");
  fs.writeFileSync(reportMdPath, markdown);

  if (summary.fail > 0) {
    console.error(`[asset-audit] failed: ${summary.fail}/${summary.total}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[asset-audit] passed: ${summary.pass}/${summary.total}`);
}

await main();
