import { stat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TAGS = [
  "accessibility",
  "adapt",
  "animation",
  "ascii",
  "audit",
  "brand",
  "brutalist",
  "cinematic",
  "color",
  "concept",
  "copy",
  "delight",
  "design",
  "editorial",
  "frontend",
  "homepage",
  "interaction",
  "layout",
  "luxury",
  "memory",
  "motion",
  "overdrive",
  "polish",
  "product",
  "responsive",
  "spatial",
  "typography",
  "ui",
  "ux",
  "website"
];

export async function importMemory({ config, rootDir = process.cwd() }) {
  const entries = [];
  const stats = {
    sourcesConfigured: config.memorySources.length,
    sourcesFound: 0,
    filesScanned: 0,
    filesSkipped: 0
  };

  const excludeDirectories = new Set(
    (config.excludeDirectories ?? []).map((name) => name.toLowerCase())
  );
  const includeExtensions = new Set(
    (config.includeExtensions ?? [".md"]).map((ext) => ext.toLowerCase())
  );

  for (const source of config.memorySources) {
    const sourcePath = path.resolve(source.path);
    if (!(await pathExists(sourcePath))) {
      stats.filesSkipped += 1;
      continue;
    }

    stats.sourcesFound += 1;
    for await (const filePath of walkFiles(sourcePath, { excludeDirectories, stats })) {
      if (!includeExtensions.has(path.extname(filePath).toLowerCase())) {
        stats.filesSkipped += 1;
        continue;
      }

      const entry = await buildEntry(filePath, source, rootDir);
      if (entry) {
        stats.filesScanned += 1;
        entries.push(entry);
      } else {
        stats.filesSkipped += 1;
      }
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    stats,
    entries
  };
}

async function* walkFiles(currentPath, { excludeDirectories, stats }) {
  const currentStat = await stat(currentPath);

  if (currentStat.isFile()) {
    yield currentPath;
    return;
  }

  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const nextPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (excludeDirectories.has(entry.name.toLowerCase())) {
        stats.filesSkipped += 1;
        continue;
      }

      yield* walkFiles(nextPath, { excludeDirectories, stats });
      continue;
    }

    if (entry.isFile()) {
      yield nextPath;
    }
  }
}

async function buildEntry(filePath, source, rootDir) {
  const raw = await readFile(filePath, "utf8");
  const cleaned = normalizeText(stripFrontmatter(raw));

  if (cleaned.length < 80) {
    return null;
  }

  const fileStat = await stat(filePath);
  const title = extractTitle(raw) ?? titleFromFilename(filePath);
  const summary = summarize(cleaned);
  const tags = inferTags({ text: cleaned, filePath, title, source });
  const relativePath = path.isAbsolute(filePath)
    ? filePath
    : path.relative(rootDir, filePath);

  return {
    id: stableId(source.id, filePath),
    title,
    path: relativePath,
    sourceId: source.id,
    sourceLabel: source.label,
    sourceType: source.type,
    modifiedAt: fileStat.mtime.toISOString(),
    wordCount: countWords(cleaned),
    tags,
    summary,
    excerpt: cleaned.slice(0, 700)
  };
}

function extractTitle(raw) {
  const heading = raw.match(/^#\s+(.+)$/m);
  if (heading?.[1]) {
    return heading[1].trim();
  }

  const nameField = raw.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  if (nameField?.[1]) {
    return nameField[1].trim();
  }

  return null;
}

function titleFromFilename(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stripFrontmatter(raw) {
  return raw.replace(/^---[\s\S]*?---\s*/, "");
}

function normalizeText(raw) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return text.slice(0, 220);
  }

  return sentences.slice(0, 2).join(" ").slice(0, 320);
}

function inferTags({ text, filePath, title, source }) {
  const haystack = `${filePath} ${title} ${text}`.toLowerCase();
  const tags = new Set();

  for (const tag of DEFAULT_TAGS) {
    if (haystack.includes(tag)) {
      tags.add(tag);
    }
  }

  if (source.type === "skill-library") {
    tags.add("skill");
  }

  if (source.type === "obsidian-vault") {
    tags.add("memory");
  }

  if (source.type === "design-repo") {
    tags.add("design");
  }

  return [...tags].sort();
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function stableId(sourceId, filePath) {
  return `${sourceId}:${filePath.toLowerCase().replace(/\\/g, "/")}`;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}
