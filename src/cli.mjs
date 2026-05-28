import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { importMemory } from "./memory/importer.mjs";
import { searchMemory } from "./memory/search.mjs";
import { captureAssets } from "./run/assets.mjs";
import { generateConcepts } from "./run/concepts.mjs";
import { selectFinalists, upgradeFinalists } from "./run/finalists.mjs";
import { createRun } from "./run/intake.mjs";
import { validateRun } from "./run/validate.mjs";

const rootDir = process.cwd();
const configPath = path.join(rootDir, "web-builder.config.json");
const indexPath = path.join(rootDir, "memory", "index.json");

const commands = {
  help: showHelp,
  "memory:import": runImport,
  "memory:search": runSearch,
  "run:assets": runAssets,
  "run:concepts": runConcepts,
  "run:new": runNew,
  "run:select": runSelect,
  "run:upgrade": runUpgrade,
  "run:validate": runValidate
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

async function runAssets(args) {
  const runId = requireRunId(args, "npm run run:assets -- <run-id>");
  if (!runId) return;

  const result = await captureAssets({ rootDir, runId });
  console.log(`Captured ${result.downloaded} assets for ${runId}.`);
  console.log(`Recorded ${result.total} asset candidates.`);
  console.log(`Saved ${path.relative(rootDir, result.manifestPath)}.`);
}

async function runConcepts(args) {
  const runId = requireRunId(args, "npm run run:concepts -- <run-id>");
  if (!runId) return;

  const result = await generateConcepts({ rootDir, runId, indexPath });
  console.log(`Generated ${result.concepts.length} concepts for ${runId}.`);
  console.log(`Gallery: ${path.relative(rootDir, result.galleryPath)}`);
}

async function runSelect(args) {
  const [runId, firstConcept, secondConcept] = args;
  if (!runId || !firstConcept || !secondConcept) {
    console.error("Usage: npm run run:select -- <run-id> <concept-a> <concept-b>");
    process.exitCode = 1;
    return;
  }

  const result = await selectFinalists({ rootDir, runId, conceptIds: [firstConcept, secondConcept] });
  console.log(`Selected finalists for ${runId}: ${result.selected.join(", ")}.`);
  console.log(`Saved ${path.relative(rootDir, result.selectionPath)}.`);
}

async function runUpgrade(args) {
  const runId = requireRunId(args, "npm run run:upgrade -- <run-id>");
  if (!runId) return;

  const result = await upgradeFinalists({ rootDir, runId, indexPath });
  console.log(`Upgraded ${result.finalists.length} finalists for ${runId}.`);
}

async function runValidate(args) {
  const runId = requireRunId(args, "npm run run:validate -- <run-id>");
  if (!runId) return;

  const result = await validateRun({ rootDir, runId });
  console.log(result.passed ? `Run ${runId} passed validation.` : `Run ${runId} needs attention.`);
  console.log(`Report: ${path.relative(rootDir, result.reportPath)}`);

  if (!result.passed) {
    process.exitCode = 1;
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

function requireRunId(args, usage) {
  const runId = args[0];

  if (!runId) {
    console.error(`Usage: ${usage}`);
    process.exitCode = 1;
    return null;
  }

  return runId;
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

  npm run run:assets -- <run-id>
    Download and record reusable target-site assets.

  npm run run:concepts -- <run-id>
    Generate five static redesign concept slots and a gallery.

  npm run run:select -- <run-id> concept-01 concept-04
    Select two concepts as finalists.

  npm run run:upgrade -- <run-id>
    Upgrade selected finalists with cinematic motion and ASCII hooks.

  npm run run:validate -- <run-id>
    Validate that a run has all required MVP artifacts.

  npm test
    Run importer and search tests.
`);
}
