import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { importMemory } from "../src/memory/importer.mjs";
import { searchMemory } from "../src/memory/search.mjs";

test("memory importer indexes markdown and excludes noisy folders", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "web-builder-memory-"));

  try {
    await mkdir(path.join(fixtureRoot, "playbooks"), { recursive: true });
    await mkdir(path.join(fixtureRoot, "node_modules", "noise"), { recursive: true });

    await writeFile(
      path.join(fixtureRoot, "playbooks", "cinematic-ascii.md"),
      "# Cinematic ASCII Playbook\n\nUse cinematic motion, ASCII texture, and dramatic layout timing for premium web design."
    );
    await writeFile(
      path.join(fixtureRoot, "node_modules", "noise", "readme.md"),
      "# Dependency Docs\n\nThis should never become web-builder memory."
    );

    const result = await importMemory({
      config: {
        memorySources: [
          {
            id: "fixture",
            label: "Fixture",
            path: fixtureRoot,
            type: "obsidian-vault"
          }
        ],
        excludeDirectories: ["node_modules"],
        includeExtensions: [".md"]
      }
    });

    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].title, "Cinematic ASCII Playbook");
    assert(result.entries[0].tags.includes("cinematic"));
    assert(result.entries[0].tags.includes("ascii"));
    assert.equal(result.stats.sourcesFound, 1);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("memory search ranks tag and title matches", () => {
  const entries = [
    {
      title: "Layout Notes",
      path: "layout.md",
      sourceLabel: "Docs",
      sourceType: "obsidian-vault",
      tags: ["layout"],
      summary: "Spacing and composition."
    },
    {
      title: "Cinematic ASCII Motion",
      path: "cinematic-ascii.md",
      sourceLabel: "Playbooks",
      sourceType: "skill-library",
      tags: ["cinematic", "ascii", "motion"],
      summary: "High-end page load motion."
    }
  ];

  const results = searchMemory(entries, "cinematic ascii motion");

  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Cinematic ASCII Motion");
  assert(results[0].score > 0);
});
