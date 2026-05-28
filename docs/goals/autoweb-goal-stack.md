# AutoWeb Goal Stack

Date: 2026-05-28

## Goal

Build AutoWeb into a complete local MVP for memory-indexed website redesign:

1. import curated design memory
2. analyze a target webpage and optional inspiration page
3. capture reusable target-site assets
4. generate five distinct static redesign concepts
5. select two finalists
6. upgrade finalists with cinematic, ASCII, motion, and polish hooks
7. validate a run end to end
8. update GitHub, Obsidian memory, AI_OS, lint, and tests when complete

## Definition Of Done

The MVP is complete when a user can run the following workflow:

```text
npm run memory:import
npm run run:new -- --target <url> --inspiration <url> --name <name>
npm run run:assets -- <run-id>
npm run run:concepts -- <run-id>
npm run run:select -- <run-id> concept-01 concept-04
npm run run:upgrade -- <run-id>
npm run run:validate -- <run-id>
```

The completed run should contain:

- `input.json`
- `target-analysis.json`
- `target-brief.md`
- optional `inspiration-analysis.json`
- optional `inspiration-brief.md`
- `assets/assets.json`
- five concept folders with `index.html`, `brief.md`, and `metadata.json`
- `concepts/index.html` gallery
- two finalist folders with upgraded `index.html`, `brief.md`, and `metadata.json`
- `validation-report.md`

## Out Of Scope For MVP

- Hosted deployment
- Multi-page crawling
- Full LLM API orchestration
- Browser screenshot automation
- Legal review of third-party assets
- Production image/logo rewriting
- CMS or client portal

## Completed

- Project foundation
- Curated memory importer
- Memory search
- Target webpage intake analyzer
- Optional inspiration URL analyzer
- Lint command
- GitHub repo connection
- Obsidian and AI_OS checkpoint memory

## Remaining Build Goals

### Goal 1: Asset Capture

Capture likely logos, SVGs, images, and stylesheet references into each run.

Done when:

- `npm run run:assets -- <run-id>` exists
- assets are downloaded when possible
- `assets/assets.json` records source URL, local path, type, and status
- missing assets are warnings, not blockers

### Goal 2: Five Static Concepts

Generate five static redesign concept slots from target brief, assets, and memory search.

Done when:

- `npm run run:concepts -- <run-id>` exists
- five concept folders are created
- each concept has a distinct lane and technique stack
- each concept has `index.html`, `brief.md`, and `metadata.json`
- a gallery links all five concepts

### Goal 3: Finalist Selection

Let the user choose two concepts to carry forward.

Done when:

- `npm run run:select -- <run-id> concept-01 concept-04` exists
- selected concepts are validated
- finalist folders are created
- source concept metadata is preserved

### Goal 4: Cinematic Finalist Upgrade

Upgrade the two selected concepts into richer dynamic pages.

Done when:

- `npm run run:upgrade -- <run-id>` exists
- finalist pages include cinematic motion hooks
- finalist pages include ASCII or text-art systems
- reduced-motion fallback exists
- upgrade metadata records techniques used

### Goal 5: Run Validation

Validate that a run is complete and readable.

Done when:

- `npm run run:validate -- <run-id>` exists
- report checks all required files
- report gives clear pass/fail status
- failed phases can be rerun without deleting the run

## Final Housekeeping Goal

After the MVP goals are complete:

- run `npm run lint`
- run `npm test`
- commit AutoWeb changes
- push AutoWeb to GitHub
- update Obsidian memory
- update AI_OS
- push memory repos
