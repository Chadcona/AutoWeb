import { createServer as createHttpServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importMemory } from "../memory/importer.mjs";
import { captureAssets } from "../run/assets.mjs";
import { generateConcepts } from "../run/concepts.mjs";
import { selectFinalists, upgradeFinalists } from "../run/finalists.mjs";
import { createRun } from "../run/intake.mjs";
import { readJson, writeJson } from "../run/files.mjs";
import { validateRun } from "../run/validate.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(moduleDir, "public");
const defaultPort = Number(process.env.PORT || 3030);

export function createDashboardServer({ rootDir = process.cwd(), port = defaultPort } = {}) {
  const configPath = path.join(rootDir, "web-builder.config.json");
  const indexPath = path.join(rootDir, "memory", "index.json");
  const runsDir = path.join(rootDir, "runs");

  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (request.method === "GET" && url.pathname === "/") {
        await sendFile(response, path.join(publicDir, "index.html"));
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/static/")) {
        await sendFile(response, safeJoin(publicDir, decodeURIComponent(url.pathname.replace("/static/", ""))));
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/runs/")) {
        await sendFile(response, safeJoin(rootDir, decodeURIComponent(url.pathname.slice(1))));
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        await handleApi({ request, response, url, rootDir, configPath, indexPath, runsDir });
        return;
      }

      sendJson(response, { error: "Not found" }, 404);
    } catch (error) {
      sendJson(response, { error: error.message }, 500);
    }
  });

  return {
    server,
    port,
    url: `http://localhost:${port}`
  };
}

export async function startDashboard({ rootDir = process.cwd(), port = defaultPort, open = false } = {}) {
  const dashboard = createDashboardServer({ rootDir, port });

  await new Promise((resolve) => dashboard.server.listen(port, "127.0.0.1", resolve));
  console.log(`AutoWeb dashboard running at ${dashboard.url}`);

  if (open) {
    openBrowser(dashboard.url);
  }

  return dashboard;
}

async function handleApi({ request, response, url, rootDir, configPath, indexPath, runsDir }) {
  if (request.method === "GET" && url.pathname === "/api/status") {
    sendJson(response, await getStatus({ rootDir, indexPath, runsDir }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/runs") {
    sendJson(response, { runs: await listRuns({ runsDir }) });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/runs/")) {
    const runId = decodeURIComponent(url.pathname.split("/")[3] ?? "");
    sendJson(response, await describeRun({ rootDir, runId }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/memory/import") {
    const config = await readJson(configPath);
    const result = await importMemory({ config, rootDir });
    await writeJson(indexPath, result);
    sendJson(response, { ok: true, entries: result.entries.length, stats: result.stats });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/runs/new") {
    const body = await readBodyJson(request);
    const run = await createRun({
      rootDir,
      targetUrl: body.targetUrl,
      inspirationUrl: body.inspirationUrl || null,
      name: body.name || undefined
    });
    sendJson(response, { ok: true, runId: run.runId, run: await describeRun({ rootDir, runId: run.runId }) });
    return;
  }

  if (request.method === "POST" && url.pathname.match(/^\/api\/runs\/[^/]+\/assets$/)) {
    const runId = decodeURIComponent(url.pathname.split("/")[3]);
    const result = await captureAssets({ rootDir, runId });
    sendJson(response, { ok: true, result, run: await describeRun({ rootDir, runId }) });
    return;
  }

  if (request.method === "POST" && url.pathname.match(/^\/api\/runs\/[^/]+\/concepts$/)) {
    const runId = decodeURIComponent(url.pathname.split("/")[3]);
    const result = await generateConcepts({ rootDir, runId, indexPath });
    sendJson(response, { ok: true, result, run: await describeRun({ rootDir, runId }) });
    return;
  }

  if (request.method === "POST" && url.pathname.match(/^\/api\/runs\/[^/]+\/select$/)) {
    const runId = decodeURIComponent(url.pathname.split("/")[3]);
    const body = await readBodyJson(request);
    const result = await selectFinalists({ rootDir, runId, conceptIds: body.conceptIds ?? [] });
    sendJson(response, { ok: true, result, run: await describeRun({ rootDir, runId }) });
    return;
  }

  if (request.method === "POST" && url.pathname.match(/^\/api\/runs\/[^/]+\/upgrade$/)) {
    const runId = decodeURIComponent(url.pathname.split("/")[3]);
    const result = await upgradeFinalists({ rootDir, runId, indexPath });
    sendJson(response, { ok: true, result, run: await describeRun({ rootDir, runId }) });
    return;
  }

  if (request.method === "POST" && url.pathname.match(/^\/api\/runs\/[^/]+\/validate$/)) {
    const runId = decodeURIComponent(url.pathname.split("/")[3]);
    const result = await validateRun({ rootDir, runId });
    sendJson(response, { ok: result.passed, result, run: await describeRun({ rootDir, runId }) });
    return;
  }

  sendJson(response, { error: "Unknown API route" }, 404);
}

async function getStatus({ rootDir, indexPath, runsDir }) {
  const memory = existsSync(indexPath) ? await readJson(indexPath) : null;
  return {
    rootDir,
    memoryEntries: memory?.entries?.length ?? 0,
    memoryGeneratedAt: memory?.generatedAt ?? null,
    runs: await listRuns({ runsDir })
  };
}

async function listRuns({ runsDir }) {
  if (!existsSync(runsDir)) {
    return [];
  }

  const entries = await readdir(runsDir, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const runDir = path.join(runsDir, entry.name);
    const inputPath = path.join(runDir, "input.json");
    const input = existsSync(inputPath) ? await readJson(inputPath) : null;
    const runStat = await stat(runDir);
    runs.push({
      runId: entry.name,
      name: input?.runId ?? entry.name,
      targetUrl: input?.targetUrl ?? null,
      inspirationUrl: input?.inspirationUrl ?? null,
      createdAt: input?.createdAt ?? runStat.birthtime.toISOString()
    });
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
}

async function describeRun({ rootDir, runId }) {
  const runDir = path.join(rootDir, "runs", runId);
  if (!existsSync(runDir)) {
    throw new Error(`Run not found: ${runId}`);
  }

  const has = (relativePath) => existsSync(path.join(runDir, relativePath));
  const input = has("input.json") ? await readJson(path.join(runDir, "input.json")) : null;
  const assets = has(path.join("assets", "assets.json")) ? await readJson(path.join(runDir, "assets", "assets.json")) : null;

  return {
    runId,
    targetUrl: input?.targetUrl ?? null,
    inspirationUrl: input?.inspirationUrl ?? null,
    createdAt: input?.createdAt ?? null,
    status: {
      targetBrief: has("target-brief.md"),
      targetAnalysis: has("target-analysis.json"),
      inspirationBrief: has("inspiration-brief.md"),
      assets: has(path.join("assets", "assets.json")),
      concepts: has(path.join("concepts", "index.html")),
      selection: has(path.join("finalists", "selection.json")),
      finalists: has(path.join("finalists", "finalist-a", "index.html")) && has(path.join("finalists", "finalist-b", "index.html")),
      validation: has("validation-report.md")
    },
    assets: {
      total: assets?.total ?? 0,
      downloaded: assets?.downloaded ?? 0
    },
    links: buildRunLinks(runId)
  };
}

function buildRunLinks(runId) {
  return {
    targetBrief: `/runs/${encodeURIComponent(runId)}/target-brief.md`,
    conceptsGallery: `/runs/${encodeURIComponent(runId)}/concepts/index.html`,
    concept01: `/runs/${encodeURIComponent(runId)}/concepts/concept-01/index.html`,
    concept02: `/runs/${encodeURIComponent(runId)}/concepts/concept-02/index.html`,
    concept03: `/runs/${encodeURIComponent(runId)}/concepts/concept-03/index.html`,
    concept04: `/runs/${encodeURIComponent(runId)}/concepts/concept-04/index.html`,
    concept05: `/runs/${encodeURIComponent(runId)}/concepts/concept-05/index.html`,
    finalistA: `/runs/${encodeURIComponent(runId)}/finalists/finalist-a/index.html`,
    finalistB: `/runs/${encodeURIComponent(runId)}/finalists/finalist-b/index.html`,
    validation: `/runs/${encodeURIComponent(runId)}/validation-report.md`
  };
}

async function sendFile(response, filePath) {
  const content = await readFile(filePath);
  response.writeHead(200, { "content-type": contentType(filePath) });
  response.end(content);
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value, null, 2));
}

async function readBodyJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function safeJoin(rootDir, relativePath) {
  const resolved = path.resolve(rootDir, relativePath);
  const root = path.resolve(rootDir);

  if (!resolved.startsWith(root)) {
    throw new Error("Blocked unsafe path.");
  }

  return resolved;
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
  };

  return types[extension] ?? "application/octet-stream";
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("powershell", ["-NoProfile", "-Command", "Start-Process", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const open = process.argv.includes("--open");
  await startDashboard({ open });
}
