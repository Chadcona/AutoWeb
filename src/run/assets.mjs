import { existsSync } from "node:fs";
import path from "node:path";
import { getRunDir, readJson, slugify, writeJson } from "./files.mjs";

const DOWNLOAD_LIMIT = 24;
const DOWNLOAD_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp"
]);

export async function captureAssets({ rootDir = process.cwd(), runId }) {
  const runDir = getRunDir(rootDir, runId);
  const analysisPath = path.join(runDir, "target-analysis.json");

  if (!existsSync(analysisPath)) {
    throw new Error(`Missing target analysis for ${runId}. Run run:new first.`);
  }

  const analysis = await readJson(analysisPath);
  const assetsDir = path.join(runDir, "assets");
  const candidates = collectCandidates(analysis);
  const assets = [];
  let downloaded = 0;

  for (const [index, candidate] of candidates.entries()) {
    const record = {
      id: `asset-${String(index + 1).padStart(2, "0")}`,
      ...candidate,
      status: "skipped",
      localPath: null,
      warning: null
    };

    if (downloaded < DOWNLOAD_LIMIT && isDownloadable(candidate.url)) {
      try {
        const response = await fetch(candidate.url, { signal: AbortSignal.timeout(12000) });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const filename = makeAssetFilename(candidate, index);
        const localPath = path.join(assetsDir, filename);
        await writeBinary(localPath, bytes);

        record.status = "downloaded";
        record.localPath = path.relative(runDir, localPath);
        record.contentType = response.headers.get("content-type") ?? null;
        record.bytes = bytes.length;
        downloaded += 1;
      } catch (error) {
        record.status = "failed";
        record.warning = error.message;
      }
    }

    assets.push(record);
  }

  const manifest = {
    runId,
    generatedAt: new Date().toISOString(),
    total: assets.length,
    downloaded,
    assets
  };
  const manifestPath = path.join(assetsDir, "assets.json");
  await writeJson(manifestPath, manifest);

  return {
    runId,
    manifestPath,
    total: assets.length,
    downloaded
  };
}

function collectCandidates(analysis) {
  const images = (analysis.images ?? []).map((asset) => ({
    type: guessType(asset.url, "image"),
    label: asset.label,
    url: asset.url,
    source: "image"
  }));
  const svgs = (analysis.svgAssets ?? []).map((asset) => ({
    type: "svg",
    label: asset.label,
    url: asset.url,
    source: "svg"
  }));
  const stylesheets = (analysis.stylesheets ?? []).map((asset) => ({
    type: "stylesheet",
    label: asset.label,
    url: asset.url,
    source: "stylesheet"
  }));

  return dedupeBy([...svgs, ...images, ...stylesheets], (asset) => `${asset.type}:${asset.url}`);
}

function isDownloadable(url) {
  if (!url || url.startsWith("(") || url.startsWith("data:") || url.startsWith("#")) {
    return false;
  }

  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return DOWNLOAD_EXTENSIONS.has(extension);
}

function makeAssetFilename(candidate, index) {
  const parsed = new URL(candidate.url);
  const extension = path.extname(parsed.pathname).toLowerCase() || ".asset";
  const base = slugify(candidate.label || path.basename(parsed.pathname, extension) || candidate.type);
  return `${String(index + 1).padStart(2, "0")}-${base}${extension}`;
}

async function writeBinary(filePath, bytes) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

function guessType(url, fallback) {
  const lower = url.toLowerCase();
  if (lower.includes("logo")) return "logo";
  if (lower.endsWith(".svg")) return "svg";
  return fallback;
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
