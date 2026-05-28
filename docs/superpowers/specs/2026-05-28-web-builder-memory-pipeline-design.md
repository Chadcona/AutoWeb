# Web Builder Memory Pipeline Design

## Purpose

Build a Web Builder pipeline that can take a target webpage URL, analyze it, and generate five fresh high-end redesign concepts using the team's curated web-design memory, skills, and markdown playbooks. After review, the user selects two concepts for a deeper finalist pass that turns them into more dynamic, cinematic pages with advanced animation, ASCII systems, and other learned techniques.

The first implementation should prove the workflow end to end with static concept outputs first. The finalist upgrade stage can be designed from the start, but it should not block the MVP.

## Scope

In scope:

- Read design knowledge from the Obsidian vault, installed skills, and selected project playbooks.
- Build a curated local memory index for Web Builder use.
- Ignore noisy sources such as `node_modules`, build artifacts, vendor docs, logs, and generated bundles.
- Accept a target site URL.
- Accept an optional inspiration site URL to guide mood, motion ambition, interaction style, or polish level.
- Inspect the target webpage for content, structure, visual patterns, screenshots, and reusable brand assets.
- Recycle and upgrade logos or graphics from the target site into a more professional visual system.
- Generate five distinct static HTML/CSS redesign concepts.
- Let the user select two finalist concepts.
- Generate richer finalist directions that can use cinematic motion, high-end ASCII, advanced transitions, and other playbook techniques.

Out of scope for the first pass:

- Full multi-page website generation.
- CMS integration.
- Hosting or deployment automation.
- Payment, auth, or client portal features.
- Fully automated legal or copyright clearance for third-party assets.

## User Flow

1. User starts a new redesign run.
2. User provides the target webpage URL.
3. User optionally provides an inspiration URL.
4. Pipeline analyzes the target site and optional inspiration reference.
5. Pipeline retrieves relevant memories and playbook techniques from the curated index.
6. Expert lanes produce five intentionally different static redesign concepts.
7. User reviews the five concepts.
8. User selects two finalists.
9. Pipeline upgrades the two finalists into more cinematic, dynamic, high-end versions.
10. User chooses the preferred final direction for future production build work.

## Architecture

The system has five main modules.

### 1. Memory Importer

The Memory Importer reads from known local sources:

- `C:\Users\chadc\Documents\Obsidian Vaults\Test Vault`
- `C:\Users\chadc\.agents\skills`
- `C:\Users\chadc\.codex\skills`
- Selected design-heavy repos such as `C:\Users\chadc\Documents\GitHub\cona-live-cinematic`

It should scan markdown and skill files, then filter aggressively. It should exclude:

- `node_modules`
- `dist`
- `build`
- `.git`
- logs
- lockfiles unless explicitly useful
- generated bundles
- third-party package docs

The importer should extract small, reusable design memories rather than copying entire long documents into every run. Useful memory types include:

- Design laws and anti-patterns.
- Motion and interaction techniques.
- Typography and layout guidance.
- Cinematic page patterns.
- ASCII and text-art presentation techniques.
- Previous successful concept lanes.
- Brand/product register guidance.
- Audit and polish heuristics.

### 2. Curated Memory Index

The curated index is stored inside the Web Builder project and acts as the reliable memory layer for generation. It should include:

- Source path.
- Extracted summary.
- Tags such as `motion`, `ascii`, `luxury`, `editorial`, `brutalist`, `layout`, `typography`, `accessibility`, `cinematic`.
- Confidence or usefulness score.
- Last indexed timestamp.
- Short excerpt or pointer back to the source.

This keeps each generation run focused. The pipeline should prefer the curated index over live full-vault scanning.

### 3. Webpage Intake Analyzer

The analyzer reads the target URL and produces a redesign brief:

- Page title, key copy, navigation, CTAs, sections, and conversion goal.
- Visual audit: palette, typography, layout density, imagery, motion, perceived quality.
- Asset inventory: logo files, icons, key images, SVGs, and brand marks.
- Screenshot references for desktop and mobile when possible.
- Problems and opportunities.
- Content that should be preserved.
- Content that can be rewritten or elevated.

The optional inspiration URL produces a separate inspiration brief:

- Mood.
- Interaction feel.
- Animation ambition.
- Spatial rhythm.
- Typography energy.
- Level of polish.

The inspiration site must not become a cloning source. It informs direction only. The target site remains the source of truth for brand, content, and asset reuse.

### 4. Expert Concept Generator

The generator creates five static HTML/CSS concepts. Each concept should have:

- A unique design lane.
- A distinct technique stack selected from memory.
- A clear rationale.
- Reused or upgraded target-site logo/graphics where available.
- Responsive layout.
- Accessibility basics.
- No generic AI default aesthetic.

The five concepts should avoid being superficial palette swaps. They should differ in structure, visual language, motion posture, typography, information architecture, and brand interpretation.

Example lane types:

- Editorial luxury.
- Cinematic signal room.
- Brutalist utility.
- ASCII command theater.
- Organic premium craft.
- Spatial bento system.
- High-contrast campaign poster.

The generator should save each concept as a separate preview file with metadata describing its memory sources and intended strengths.

### 5. Finalist Upgrade Engine

After the user selects two concepts, the Finalist Upgrade Engine expands each into a richer version. This stage can use:

- Cinematic page-load sequences.
- Scroll-based reveals.
- ASCII art systems.
- Advanced hover and transition states.
- Sound-stage or performance-inspired layout metaphors where appropriate.
- More refined logo treatments.
- Stronger responsive behavior.
- High-end polish pass.

This stage should still respect usability. Cinematic does not mean confusing, heavy, or inaccessible. It should support reduced-motion preferences.

## Data Flow

```text
Memory sources
  -> Memory Importer
  -> Curated Memory Index

Target URL + optional inspiration URL
  -> Webpage Intake Analyzer
  -> Redesign Brief

Redesign Brief + Curated Memory Index
  -> Expert Concept Generator
  -> Five static concepts

User selects two concepts
  -> Finalist Upgrade Engine
  -> Two cinematic finalist pages
```

## File And Output Model

Proposed project structure:

```text
memory/
  sources.json
  index.json
  extracts/

runs/
  <run-id>/
    input.json
    target-brief.md
    inspiration-brief.md
    assets/
    concepts/
      concept-01/
      concept-02/
      concept-03/
      concept-04/
      concept-05/
    finalists/
      finalist-a/
      finalist-b/

docs/
  superpowers/
    specs/
```

Concept metadata should record:

- Source target URL.
- Optional inspiration URL.
- Concept name.
- Design lane.
- Memory techniques used.
- Asset reuse notes.
- Known limitations.

## Error Handling

- If the target URL cannot be reached, the user should get a clear message and an option to retry or provide saved HTML/screenshots.
- If assets cannot be downloaded, concepts should proceed with text-based or recreated marks, but log what was missing.
- If the memory index is empty, the pipeline should run an import first.
- If the inspiration URL fails, the target redesign should still proceed.
- If a generated concept fails validation, the pipeline should mark it as failed and regenerate only that concept.

## Quality Gates

Every concept should pass:

- Basic HTML validity.
- Responsive desktop and mobile review.
- No obvious copied layout from the inspiration site.
- Logo/asset reuse documented.
- Reduced-motion handling for dynamic finalists.
- Accessibility baseline: readable contrast, focus states, semantic structure where practical.
- Design diversity check across the five concepts.

## Testing Plan

Initial tests should cover:

- Memory importer excludes noisy directories.
- Memory importer extracts useful markdown summaries.
- Target analyzer can process a simple public webpage.
- Inspiration URL is stored separately from target URL.
- Five concept outputs are created for a run.
- Concept metadata includes memory-source references.
- Selecting two concepts creates finalist output folders.
- Failed concept generation can be retried without restarting the whole run.

Manual QA should include:

- Review concepts in a browser.
- Compare the five concepts for real diversity.
- Confirm inspiration influence is directional, not derivative.
- Confirm target logo/graphics are reused or upgraded when available.
- Confirm finalist pages feel more cinematic without becoming confusing.

## MVP Recommendation

Build the MVP in this order:

1. Memory importer and curated index.
2. Target URL intake and brief generation.
3. Static five-concept output system.
4. Concept review and selection.
5. Two-finalist cinematic upgrade system.

This order creates a usable feedback loop early while preserving the bigger creative vision.

