import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { importMemory } from "./memory/importer.mjs";
import { searchMemory } from "./memory/search.mjs";
import { createRun } from "./run/intake.mjs";

const rootDir = process.cwd();
const configPath = path.join(rootDir, "web-builder.config.json");
const indexPath = path.join(rootDir, "memory", "index.json");

const commands = {
  help: showHelp,
  "memory:import": runImport,
  "memory:search": runSearch,
  "run:new": runNew
};

const command = process.argv[2] ?? "help";
const handler = commands[command];

if (!handler) {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exitCode = 1;
} else {
  await handler(process.argv.slice(3));
}

async function loadConfig() {
  if (!existsSync(configPath)) {
    throw new Error(`Missing config file: ${configPath}`);
  }

  return JSON.parse(await readFile(configPath, "utf8"));
}

async function runImport() {
  const config = await loadConfig();
  const result = await importMemory({ config, rootDir });

  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`Imported ${result.entries.length} memory entries.`);
  console.log(`Scanned ${result.stats.filesScanned} files from ${result.stats.sourcesFound} sources.`);
  console.log(`Skipped ${result.stats.filesSkipped} files or folders.`);
  console.log(`Saved ${path.relative(rootDir, indexPath)}.`);
}

async function runSearch(args) {
  const query = args.join(" ").trim();

  if (!query) {
    console.error('Usage: npm run memory:search -- "cinematic ascii motion"');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(indexPath)) {
    console.error("Memory index is missing. Run `npm run memory:import` first.");
    process.exitCode = 1;
    return;
  }

  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const results = searchMemory(index.entries, query, { limit: 10 });

  if (results.length === 0) {
    console.log(`No memory entries matched "${query}".`);
    return;
  }

  console.log(`Top memory matches for "${query}":\n`);
  for (const [position, result] of results.entries()) {
    console.log(`${position + 1}. ${result.title}`);
    console.log(`   score: ${result.score} | tags: ${result.tags.join(", ") || "none"}`);
    console.log(`   source: ${result.sourceLabel}`);
    console.log(`   path: ${result.path}`);
    console.log(`   ${result.summary}`);
    console.log("");
  }
}

async function runNew(args) {
  const options = parseOptions(args);

  if (!options.target) {
    console.error("Usage: npm run run:new -- --target <url> [--inspiration <url>] [--name <name>]");
    process.exitCode = 1;
    return;
  }

  const run = await createRun({
    rootDir,
    targetUrl: options.target,
    inspirationUrl: options.inspiration,
    name: options.name
  });

  console.log(`Created run ${run.runId}.`);
  console.log(`Saved ${path.relative(rootDir, run.runDir)}.`);
  console.log(`Target brief: ${path.relative(rootDir, run.files.targetBrief)}`);

  if (run.files.inspirationBrief) {
    console.log(`Inspiration brief: ${path.relative(rootDir, run.files.inspirationBrief)}`);
  }

  if (run.inspirationError) {
    console.log(`Inspiration warning: ${run.inspirationError}`);
  }
}

function parseOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function showHelp() {
  console.log(`Web Builder Memory Pipeline

Commands:
  npm run memory:import
    Build memory/index.json from configured vault, skill, and playbook sources.

  npm run memory:search -- "cinematic ascii motion"
    Search the curated memory index by keywords and tags.

  npm run run:new -- --target <url> [--inspiration <url>] [--name <name>]
    Analyze a target webpage and optional inspiration URL into a run brief.

  npm test
    Run importer and search tests.
`);
}
