import { cp, readFile } from "node:fs/promises";
import path from "node:path";
import { searchMemory } from "../memory/search.mjs";
import { escapeHtml, getRunDir, readJson, writeJson, writeText } from "./files.mjs";

export async function selectFinalists({ rootDir = process.cwd(), runId, conceptIds }) {
  const runDir = getRunDir(rootDir, runId);
  const unique = [...new Set(conceptIds)];

  if (unique.length !== 2) {
    throw new Error("Select exactly two different concepts.");
  }

  for (const conceptId of unique) {
    await readJson(path.join(runDir, "concepts", conceptId, "metadata.json"));
  }

  const finalistsDir = path.join(runDir, "finalists");
  const slots = ["finalist-a", "finalist-b"];

  for (const [index, conceptId] of unique.entries()) {
    await cp(
      path.join(runDir, "concepts", conceptId),
      path.join(finalistsDir, slots[index]),
      { recursive: true, force: true }
    );
  }

  const selection = {
    runId,
    selectedAt: new Date().toISOString(),
    selected: unique,
    finalists: slots.map((slot, index) => ({
      slot,
      sourceConcept: unique[index]
    }))
  };
  const selectionPath = path.join(finalistsDir, "selection.json");
  await writeJson(selectionPath, selection);

  return {
    runId,
    selected: unique,
    selectionPath
  };
}

export async function upgradeFinalists({ rootDir = process.cwd(), runId, indexPath }) {
  const runDir = getRunDir(rootDir, runId);
  const selection = await readJson(path.join(runDir, "finalists", "selection.json"));
  const target = await readJson(path.join(runDir, "target-analysis.json"));
  const memoryIndex = JSON.parse(await readFile(indexPath, "utf8")).entries ?? [];
  const upgradeMemories = searchMemory(memoryIndex, "cinematic motion ascii interaction polish overdrive", { limit: 6 });
  const upgraded = [];

  for (const finalist of selection.finalists) {
    const finalistDir = path.join(runDir, "finalists", finalist.slot);
    const sourceMetadata = await readJson(path.join(finalistDir, "metadata.json"));
    const metadata = {
      ...sourceMetadata,
      upgradedAt: new Date().toISOString(),
      sourceConcept: finalist.sourceConcept,
      upgradeTechniques: [
        "cinematic page-load sequence",
        "ASCII signal texture",
        "scroll reveal hooks",
        "advanced hover states",
        "reduced-motion fallback"
      ],
      upgradeMemorySources: upgradeMemories.map((entry) => ({
        title: entry.title,
        path: entry.path,
        tags: entry.tags,
        score: entry.score
      }))
    };

    await writeJson(path.join(finalistDir, "metadata.json"), metadata);
    await writeText(path.join(finalistDir, "brief.md"), renderUpgradeBrief(metadata));
    await writeText(path.join(finalistDir, "index.html"), renderUpgradedHtml({ metadata, target }));
    upgraded.push(finalist.slot);
  }

  return {
    runId,
    finalists: upgraded
  };
}

function renderUpgradeBrief(metadata) {
  return `# ${metadata.name} Finalist Upgrade

## Source

- Source concept: ${metadata.sourceConcept}
- Original tone: ${metadata.lane.tone}
- Original structure: ${metadata.lane.structure}

## Cinematic Upgrade Techniques

${metadata.upgradeTechniques.map((technique) => `- ${technique}`).join("\n")}

## Memory Sources

${metadata.upgradeMemorySources.map((source) => `- ${source.title} (${source.tags.slice(0, 5).join(", ")})`).join("\n")}

## Accessibility Rule

Motion must support \`prefers-reduced-motion\`. Cinematic polish should clarify and elevate the page, not make the conversion path harder.
`;
}

function renderUpgradedHtml({ metadata, target }) {
  const hero = target.headings.find((heading) => heading.level === 1)?.text ?? target.title;
  const cta = target.ctas[0] ?? { text: "Begin", href: target.metadata.url };
  const source = metadata.assetReuse?.find((asset) => asset.localPath);
  const assetSrc = source ? `../../${source.localPath.replace(/\\/g, "/")}` : null;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metadata.name)} Finalist | ${escapeHtml(target.title)}</title>
  <style>
    :root { --bg: #10120e; --ink: #f2eadc; --accent: #e7643c; --signal: #66d7aa; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 20% 0%, #4e2519, transparent 34rem), var(--bg); font-family: Georgia, serif; overflow-x: hidden; }
    body::before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .18; background-image: linear-gradient(transparent 95%, var(--signal) 96%), linear-gradient(90deg, transparent 95%, var(--signal) 96%); background-size: 34px 34px; animation: drift 18s linear infinite; }
    main { width: min(1160px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 72px; }
    .prelude { min-height: 100vh; display: grid; align-items: center; grid-template-columns: 1.05fr .95fr; gap: 38px; }
    .eyebrow { color: var(--signal); font: 700 12px/1 "Courier New", monospace; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 18px 0; font-size: clamp(54px, 9vw, 132px); line-height: .82; letter-spacing: -.08em; animation: rise .8s cubic-bezier(.22,1,.36,1) both; }
    .deck { color: #dccfbd; font-size: clamp(18px, 2vw, 25px); line-height: 1.38; max-width: 34rem; animation: rise .8s .12s cubic-bezier(.22,1,.36,1) both; }
    .cta { display: inline-block; margin-top: 22px; padding: 16px 22px; border: 1px solid var(--accent); color: var(--ink); text-decoration: none; text-transform: uppercase; letter-spacing: .12em; font: 700 13px/1 "Courier New", monospace; background: #e7643c22; }
    .signal-card { border: 1px solid #ffffff22; padding: 22px; background: #0b0d0acc; box-shadow: 0 40px 120px #0008; animation: floatIn 1s .18s cubic-bezier(.22,1,.36,1) both; }
    .signal-card img { width: 72px; height: 72px; object-fit: contain; margin-bottom: 18px; filter: drop-shadow(0 0 24px #e7643c88); }
    pre { white-space: pre-wrap; color: var(--signal); font: 12px/1.1 "Courier New", monospace; }
    .reel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .frame { min-height: 220px; border: 1px solid #ffffff22; padding: 20px; background: #f2eadc10; transform: translateY(18px); animation: rise .8s cubic-bezier(.22,1,.36,1) both; }
    .frame:nth-child(2) { animation-delay: .12s; }
    .frame:nth-child(3) { animation-delay: .24s; }
    @keyframes rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes floatIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes drift { to { transform: translateY(34px); } }
    @media (max-width: 820px) { .prelude, .reel { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) {
      *, body::before { animation: none !important; scroll-behavior: auto !important; }
    }
  </style>
</head>
<body>
  <main>
    <section class="prelude">
      <div>
        <div class="eyebrow">${escapeHtml(metadata.name)} / finalist upgrade</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(target.description || metadata.lane.tone)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
      </div>
      <aside class="signal-card">
        ${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}
        <pre>╔══════════════════════╗
║  AUTOWEB FINALIST   ║
║  MEMORY: ONLINE     ║
║  MOTION: ARMED      ║
║  ASCII: SIGNALING   ║
╚══════════════════════╝</pre>
      </aside>
    </section>
    <section class="reel">
      <article class="frame">Cinematic page-load sequence with reduced-motion fallback.</article>
      <article class="frame">ASCII signal layer adds memorability without stealing the conversion path.</article>
      <article class="frame">Target content, assets, and CTA remain the source of truth.</article>
    </section>
  </main>
</body>
</html>
`;
}
