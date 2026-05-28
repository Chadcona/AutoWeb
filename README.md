# Web Builder Memory Pipeline

This project builds a curated memory layer for high-end website redesign work. It scans the Obsidian vault, installed skills, and selected project playbooks, then produces a focused local index that future redesign runs can use.

## First Commands

```powershell
npm install
npm run help
npm run lint
npm run memory:import
npm run memory:search -- "cinematic ascii motion"
npm run run:new -- --target https://example.com --inspiration https://example.org --name example-redesign
npm run run:assets -- <run-id>
npm run run:concepts -- <run-id>
npm run run:select -- <run-id> concept-01 concept-04
npm run run:upgrade -- <run-id>
npm run run:validate -- <run-id>
```

Generated memory and run data are local-only and ignored by Git.

## Current Build Status

Implemented:

- Project CLI foundation.
- Configured memory source paths.
- Curated memory importer.
- Keyword/tag memory search.
- Target webpage intake analyzer.
- Optional inspiration URL brief.
- Dependency-free lint pass.
- Asset capture.
- Five static concept outputs and gallery.
- Two-finalist selection.
- Cinematic finalist upgrade scaffolding.
- Run validation report.

Next:

- Browser screenshots and visual QA.
- More advanced generated design variation.
