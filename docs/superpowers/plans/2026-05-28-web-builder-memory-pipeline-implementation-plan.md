# Web Builder Memory Pipeline Implementation Plan

## Goal

Implement the approved Web Builder MVP in small, testable slices:

1. Import and curate useful web-design memory from the Obsidian vault, installed skills, and selected project playbooks.
2. Analyze a target webpage URL and optional inspiration URL.
3. Generate a structured run folder with five static concept slots.
4. Let the user select two finalists.
5. Prepare the finalist upgrade stage for cinematic, ASCII, and advanced motion work.

This plan intentionally starts with the memory and run infrastructure before building the richer generation layer.

## Phase 1: Project Foundation

Create a small Node-based project with clear scripts and plain file outputs.

Tasks:

- Add `package.json`.
- Add source folders for CLI commands and core modules.
- Add `memory/` and `runs/` output folders to `.gitignore` if generated data should stay local.
- Add a README with the first-run workflow.
- Add a config file that records default memory source paths:
  - `C:\Users\chadc\Documents\Obsidian Vaults\Test Vault`
  - `C:\Users\chadc\.agents\skills`
  - `C:\Users\chadc\.codex\skills`
  - `C:\Users\chadc\Documents\GitHub\cona-live-cinematic`

Acceptance checks:

- `npm install` works.
- `npm run help` or equivalent lists available commands.
- Generated local output folders are ignored by Git.

## Phase 2: Memory Importer

Build the curated memory index first.

Tasks:

- Walk configured source directories.
- Include markdown files and skill files.
- Exclude noisy directories and files:
  - `node_modules`
  - `.git`
  - `.superpowers`
  - `dist`
  - `build`
  - `builds`
  - logs
  - generated bundles
  - dependency package docs
- Extract metadata:
  - path
  - title or inferred title
  - source type
  - modified time
  - word count
  - tags inferred from filename and content
- Generate short deterministic summaries using local text heuristics first.
- Save `memory/index.json`.
- Save extracted source snippets in `memory/extracts/` only when useful.

Acceptance checks:

- Running the importer creates `memory/index.json`.
- Index includes known useful files such as `impeccable` references and Obsidian design specs.
- Index excludes dependency noise.
- Re-running the importer updates timestamps without duplicating entries.

## Phase 3: Memory Retrieval

Create the retrieval layer used by future concept generation.

Tasks:

- Add a search command that accepts tags and keywords.
- Rank entries by tag match, title match, and summary match.
- Add a command to show the top memories for a design brief.
- Add guardrails so long files are referenced by summary and path, not dumped wholesale.

Acceptance checks:

- Searching `cinematic motion ascii` returns relevant playbooks/specs.
- Searching `homepage luxury editorial` returns prior homepage concepts and design guidance.
- Retrieval output is concise enough to use in generation prompts.

## Phase 4: Webpage Intake Analyzer

Build target and inspiration URL intake.

Tasks:

- Add a `new-run` command that accepts:
  - required `--target <url>`
  - optional `--inspiration <url>`
  - optional `--name <run-name>`
- Fetch target page HTML.
- Extract:
  - title
  - meta description
  - headings
  - navigation links
  - CTA-like links/buttons
  - image and SVG candidates
  - stylesheet references
- Save `runs/<run-id>/input.json`.
- Save `runs/<run-id>/target-brief.md`.
- If inspiration URL is provided, save `runs/<run-id>/inspiration-brief.md`.
- Keep inspiration analysis separate from target analysis.

Acceptance checks:

- A public webpage creates a run folder.
- Target brief preserves important content and asset candidates.
- Inspiration brief describes mood and direction, not copyable structure.
- If the inspiration URL fails, the target run still completes.

## Phase 5: Asset Capture

Capture reusable target-site assets without overreaching.

Tasks:

- Download likely logo and key graphic assets into `runs/<run-id>/assets/`.
- Preserve source URL and filename metadata.
- Prefer SVG and high-resolution assets when available.
- Add a fallback mark brief when no logo can be captured.

Acceptance checks:

- Asset metadata records where each asset came from.
- Missing assets do not fail the run.
- The target brief lists which assets are likely logo/brand marks.

## Phase 6: Five Static Concept Slots

Create the first usable generation output layer.

Tasks:

- Add `generate-concepts <run-id>`.
- Build five concept folders:
  - `concept-01`
  - `concept-02`
  - `concept-03`
  - `concept-04`
  - `concept-05`
- For each concept, create:
  - `index.html`
  - `metadata.json`
  - `brief.md`
- Assign each concept a distinct lane and technique stack from memory.
- Start with scaffolded high-quality static pages if fully automated generation is not ready.
- Add a run gallery page that links to all five concepts.

Acceptance checks:

- The command creates five separate concept folders.
- Metadata names distinct lanes and memory sources.
- The gallery opens locally in a browser.
- Concepts are structurally different, not just color swaps.

## Phase 7: Finalist Selection

Add user selection mechanics.

Tasks:

- Add `select-finalists <run-id> <concept-a> <concept-b>`.
- Validate that both selected concepts exist.
- Save selection metadata.
- Create `runs/<run-id>/finalists/finalist-a/` and `finalist-b/`.
- Copy concept source files as the starting point for finalist upgrades.

Acceptance checks:

- Invalid concept IDs are rejected clearly.
- Exactly two finalists are selected.
- Finalist folders preserve source concept metadata.

## Phase 8: Cinematic Finalist Upgrade Prep

Implement the first version of the cinematic upgrade system.

Tasks:

- Add `upgrade-finalists <run-id>`.
- Retrieve memories tagged with:
  - `cinematic`
  - `motion`
  - `ascii`
  - `interaction`
  - `polish`
  - `overdrive`
- Create upgraded finalist briefs.
- Add HTML/CSS/JS hooks for:
  - page-load sequence
  - scroll reveal
  - ASCII texture or ASCII hero element
  - reduced-motion fallback
  - advanced hover or transition states
- Save upgraded finalist pages.

Acceptance checks:

- Each finalist has an upgraded brief and page.
- Reduced-motion users get a calmer version.
- Upgrade metadata lists the cinematic techniques used.
- The two finalists remain visually distinct.

## Phase 9: Validation And QA

Add basic checks before calling a run complete.

Tasks:

- Validate required files exist for each run.
- Validate concept metadata shape.
- Check that five concepts exist before finalist selection.
- Check that two finalists exist before upgrade.
- Add a simple report command.

Acceptance checks:

- `validate-run <run-id>` reports pass/fail with clear next steps.
- Failed phases can be rerun without deleting the full run.

## Suggested Script Interface

```text
npm run memory:import
npm run memory:search -- "cinematic ascii motion"
npm run run:new -- --target <url> --inspiration <url>
npm run run:concepts -- <run-id>
npm run run:select -- <run-id> concept-01 concept-04
npm run run:upgrade -- <run-id>
npm run run:validate -- <run-id>
```

## Build Order

1. Project foundation.
2. Memory importer.
3. Memory retrieval.
4. URL intake analyzer.
5. Asset capture.
6. Five concept slots and gallery.
7. Finalist selection.
8. Cinematic upgrade prep.
9. Validation and QA.

## First Implementation Target

The first coding target should be phases 1 through 3:

- Initialize the project.
- Build the importer.
- Build memory search.
- Confirm the system can find useful web-design memories from the vault and skills.

This gives us a working memory layer before we ask it to design webpages.

