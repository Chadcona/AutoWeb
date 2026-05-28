import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const excludedDirs = new Set([
  ".git",
  ".superpowers",
  "memory",
  "node_modules",
  "runs"
]);
const syntaxExtensions = new Set([".js", ".mjs", ".cjs"]);
const textExtensions = new Set([".js", ".mjs", ".cjs", ".json", ".md"]);
const failures = [];

for await (const filePath of walk(rootDir)) {
  const extension = path.extname(filePath).toLowerCase();

  if (syntaxExtensions.has(extension)) {
    await checkSyntax(filePath);
  }

  if (textExtensions.has(extension)) {
    await checkText(filePath);
  }

  if (extension === ".json") {
    await checkJson(filePath);
  }
}

if (failures.length > 0) {
  console.error("Lint failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Lint passed.");
}

async function* walk(currentPath) {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      yield* walk(fullPath);
      continue;
    }

    if (entry.isFile()) {
      yield fullPath;
    }
  }
}

async function checkSyntax(filePath) {
  try {
    await execFileAsync(process.execPath, ["--check", filePath], { cwd: rootDir });
  } catch (error) {
    failures.push(`${relative(filePath)} has JavaScript syntax errors: ${error.stderr || error.message}`);
  }
}

async function checkText(filePath) {
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      failures.push(`${relative(filePath)}:${index + 1} has trailing whitespace`);
    }
  });

  if (content.length > 0 && !content.endsWith("\n")) {
    failures.push(`${relative(filePath)} is missing a final newline`);
  }
}

async function checkJson(filePath) {
  try {
    JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    failures.push(`${relative(filePath)} is invalid JSON: ${error.message}`);
  }
}

function relative(filePath) {
  return path.relative(rootDir, filePath);
}
