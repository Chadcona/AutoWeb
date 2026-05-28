import { existsSync } from "node:fs";
import path from "node:path";
import { getRunDir, writeText } from "./files.mjs";

const REQUIRED_ROOT_FILES = [
  "input.json",
  "target-analysis.json",
  "target-brief.md"
];

export async function validateRun({ rootDir = process.cwd(), runId }) {
  const runDir = getRunDir(rootDir, runId);
  const checks = [];

  for (const file of REQUIRED_ROOT_FILES) {
    checks.push(checkFile(runDir, file));
  }

  checks.push(checkFile(runDir, path.join("assets", "assets.json"), "Asset manifest"));
  checks.push(checkConcepts(runDir));
  checks.push(checkFinalists(runDir));

  const passed = checks.every((check) => check.passed);
  const reportPath = path.join(runDir, "validation-report.md");
  await writeText(reportPath, renderReport({ runId, passed, checks }));

  return {
    runId,
    passed,
    reportPath,
    checks
  };
}

function checkFile(runDir, relativePath, label = relativePath) {
  return {
    label,
    passed: existsSync(path.join(runDir, relativePath)),
    detail: relativePath
  };
}

function checkConcepts(runDir) {
  const missing = [];

  for (let index = 1; index <= 5; index += 1) {
    const conceptId = `concept-${String(index).padStart(2, "0")}`;
    for (const file of ["index.html", "brief.md", "metadata.json"]) {
      const relativePath = path.join("concepts", conceptId, file);
      if (!existsSync(path.join(runDir, relativePath))) {
        missing.push(relativePath);
      }
    }
  }

  if (!existsSync(path.join(runDir, "concepts", "index.html"))) {
    missing.push(path.join("concepts", "index.html"));
  }

  return {
    label: "Five concept outputs",
    passed: missing.length === 0,
    detail: missing.length === 0 ? "all concept files present" : `missing: ${missing.join(", ")}`
  };
}

function checkFinalists(runDir) {
  const missing = [];

  for (const slot of ["finalist-a", "finalist-b"]) {
    for (const file of ["index.html", "brief.md", "metadata.json"]) {
      const relativePath = path.join("finalists", slot, file);
      if (!existsSync(path.join(runDir, relativePath))) {
        missing.push(relativePath);
      }
    }
  }

  if (!existsSync(path.join(runDir, "finalists", "selection.json"))) {
    missing.push(path.join("finalists", "selection.json"));
  }

  return {
    label: "Two finalist outputs",
    passed: missing.length === 0,
    detail: missing.length === 0 ? "all finalist files present" : `missing: ${missing.join(", ")}`
  };
}

function renderReport({ runId, passed, checks }) {
  return `# AutoWeb Validation Report

- Run: ${runId}
- Status: ${passed ? "pass" : "needs attention"}
- Generated: ${new Date().toISOString()}

## Checks

${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"}: ${check.label} (${check.detail})`).join("\n")}
`;
}
