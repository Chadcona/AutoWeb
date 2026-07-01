import { existsSync } from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { searchMemory } from "../memory/search.mjs";
import { escapeHtml, getRunDir, readJson, writeJson, writeText } from "./files.mjs";

const LANES = [
  {
    id: "concept-01",
    name: "Editorial Authority",
    query: "homepage luxury editorial typography polish",
    tone: "calm, expensive, proof-forward",
    accent: "#7d5f3a",
    background: "#f4efe5",
    ink: "#211b17",
    structure: "magazine masthead, split proof, measured whitespace"
  },
  {
    id: "concept-02",
    name: "Cinematic Signal Room",
    query: "cinematic motion interaction homepage",
    tone: "dramatic, atmospheric, high-trust",
    accent: "#e6542f",
    background: "#141718",
    ink: "#f1eadf",
    structure: "stage-light hero, signal panels, paced reveal sections"
  },
  {
    id: "concept-03",
    name: "Brutalist Operator",
    query: "brutalist layout product clarity conversion",
    tone: "direct, operational, confident",
    accent: "#b6d13b",
    background: "#ece7d8",
    ink: "#171816",
    structure: "hard grid, visible system labels, no-nonsense CTA path"
  },
  {
    id: "concept-04",
    name: "ASCII Command Theater",
    query: "ascii cinematic motion overdrive interaction",
    tone: "technical, theatrical, memorable",
    accent: "#44c7a1",
    background: "#10130f",
    ink: "#e8f3e5",
    structure: "terminal marquee, ASCII texture, command-deck sections"
  },
  {
    id: "concept-05",
    name: "Organic Premium Craft",
    query: "luxury craft spatial colorize typography",
    tone: "warm, tactile, custom-made",
    accent: "#bc6f46",
    background: "#f2eadc",
    ink: "#2b2119",
    structure: "layered craft panels, soft asymmetry, natural proof flow"
  }
];

export async function generateConcepts({ rootDir = process.cwd(), runId, indexPath }) {
  const runDir = getRunDir(rootDir, runId);
  const target = await readJson(path.join(runDir, "target-analysis.json"));
  const inspiration = existsSync(path.join(runDir, "inspiration-analysis.json"))
    ? await readJson(path.join(runDir, "inspiration-analysis.json"))
    : null;
  const assets = existsSync(path.join(runDir, "assets", "assets.json"))
    ? await readJson(path.join(runDir, "assets", "assets.json"))
    : { assets: [] };
  const memoryIndex = existsSync(indexPath)
    ? JSON.parse(await readFile(indexPath, "utf8")).entries ?? []
    : [];
  const conceptsDir = path.join(runDir, "concepts");
  const concepts = [];

  for (const lane of LANES) {
    const memoryMatches = searchMemory(memoryIndex, lane.query, { limit: 4 });
    const conceptDir = path.join(conceptsDir, lane.id);
    const metadata = {
      id: lane.id,
      runId,
      name: lane.name,
      generatedAt: new Date().toISOString(),
      lane: {
        tone: lane.tone,
        structure: lane.structure,
        query: lane.query
      },
      targetUrl: target.metadata.url,
      inspirationUrl: inspiration?.metadata?.url ?? null,
      memorySources: memoryMatches.map((entry) => ({
        title: entry.title,
        path: entry.path,
        tags: entry.tags,
        score: entry.score
      })),
      assetReuse: selectAssets(assets.assets).map((asset) => ({
        label: asset.label,
        type: asset.type,
        localPath: asset.localPath,
        sourceUrl: asset.url
      }))
    };

    await writeJson(path.join(conceptDir, "metadata.json"), metadata);
    await writeText(path.join(conceptDir, "brief.md"), renderConceptBrief({ lane, target, inspiration, metadata }));
    await writeText(path.join(conceptDir, "index.html"), renderConceptHtml({ lane, target, inspiration, metadata }));
    concepts.push({ id: lane.id, name: lane.name, dir: conceptDir });
  }

  const galleryPath = path.join(conceptsDir, "index.html");
  await writeText(galleryPath, renderGallery({ target, concepts }));

  return {
    runId,
    concepts,
    galleryPath
  };
}

function renderConceptBrief({ lane, target, inspiration, metadata }) {
  return `# ${lane.name}

## Design Lane

- Tone: ${lane.tone}
- Structure: ${lane.structure}
- Target: ${target.metadata.url}
- Inspiration: ${inspiration?.metadata?.url ?? "none"}

## Memory Techniques

${metadata.memorySources.length > 0
    ? metadata.memorySources.map((source) => `- ${source.title} (${source.tags.slice(0, 5).join(", ")})`).join("\n")
    : "- No memory index available. Run `npm run memory:import` for richer sourcing."}

## Asset Reuse

${metadata.assetReuse.length > 0
    ? metadata.assetReuse.map((asset) => `- ${asset.label}: ${asset.localPath ?? asset.sourceUrl}`).join("\n")
    : "- No downloaded assets available yet. Run `npm run run:assets -- <run-id>` for asset capture."}
`;
}

function renderConceptHtml({ lane, target, inspiration, metadata }) {
  const renderers = {
    "concept-01": renderEditorialConcept,
    "concept-02": renderCinematicConcept,
    "concept-03": renderBrutalistConcept,
    "concept-04": renderAsciiConcept,
    "concept-05": renderCraftConcept
  };
  const renderer = renderers[lane.id] ?? renderEditorialConcept;
  return renderer({ lane, target, inspiration, metadata });
}

function getConceptContent({ lane, target, metadata }) {
  const hero = target.headings.find((heading) => heading.level === 1)?.text ?? target.title;
  const subhead = target.description || target.headings.slice(1, 3).map((heading) => heading.text).join(" ") || lane.tone;
  const cta = target.ctas[0] ?? target.navigationLinks[0] ?? { text: "Explore", href: target.metadata.url };
  const source = metadata.assetReuse.find((item) => item.localPath);
  const assetSrc = source ? `../../${source.localPath.replace(/\\/g, "/")}` : null;
  const proof = [
    ...target.headings.slice(0, 5).map((heading) => heading.text),
    lane.structure,
    lane.tone,
    "Built from target content and memory techniques."
  ];

  return {
    hero,
    subhead,
    cta,
    assetSrc,
    proof: [...new Set(proof)].slice(0, 5)
  };
}

function renderConceptDocument({ lane, target, css, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(lane.name)} | ${escapeHtml(target.title)}</title>
  <style>
${css}
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function renderConceptContext({ lane, inspiration }) {
  return `Memory lane: ${escapeHtml(lane.query)}. Inspiration influence: ${escapeHtml(inspiration?.title ?? "none")}. Direction only, never copied.`;
}

function renderEditorialConcept({ lane, target, inspiration, metadata }) {
  const { hero, subhead, cta, assetSrc, proof } = getConceptContent({ lane, target, metadata });
  const css = `    :root { --paper: #f5efe2; --ink: #221913; --soft: #8b806f; --gold: #7d5f3a; --line: #2d211833; --cream: #fffaf0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 70% 8%, #d8c59d88, transparent 28rem), var(--paper); font-family: Georgia, "Iowan Old Style", serif; }
    body::before { content: ""; position: fixed; inset: 18px; border: 1px solid var(--line); pointer-events: none; }
    main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: 28px 0 64px; }
    .top { display: grid; grid-template-columns: .7fr 1.4fr .7fr; gap: 22px; align-items: center; border-bottom: 1px solid var(--line); padding: 48px 0 24px; }
    .back, .folio { color: var(--gold); text-decoration: none; font: 800 11px/1.4 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .17em; text-transform: uppercase; }
    .brand { text-align: center; font-size: clamp(28px, 4vw, 58px); line-height: .9; letter-spacing: -.06em; }
    .brand img { width: 52px; height: 52px; object-fit: contain; display: block; margin: 0 auto 10px; border: 1px solid var(--line); border-radius: 50%; padding: 8px; background: var(--cream); }
    .hero { min-height: 58vh; display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
    h1 { margin: 0; font-size: clamp(60px, 10vw, 148px); line-height: .78; letter-spacing: -.09em; max-width: 9ch; }
    .note { padding: 28px; border-left: 7px solid var(--gold); background: #fff7e7aa; box-shadow: 0 28px 90px #4a33151a; }
    .deck { color: var(--soft); font-size: clamp(18px, 2vw, 25px); line-height: 1.42; margin: 0 0 22px; }
    .cta { display: inline-block; color: var(--cream); background: var(--ink); border-radius: 999px; padding: 14px 19px; text-decoration: none; font: 800 12px/1 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .ledger { display: grid; grid-template-columns: .62fr 1.38fr; gap: 18px; border-top: 1px solid var(--line); padding-top: 24px; }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .tile { min-height: 150px; padding: 19px; border: 1px solid var(--line); background: #fffaf066; }
    .tile b { display: block; color: var(--gold); margin-bottom: 14px; font: 800 12px/1 "Gill Sans", sans-serif; letter-spacing: .16em; }
    .context { margin-top: 24px; color: var(--soft); font-size: 13px; }
    @media (max-width: 840px) { body::before { inset: 10px; } .top, .hero, .ledger, .tiles { grid-template-columns: 1fr; } .brand { text-align: left; } h1 { max-width: none; } }`;
  const body = `  <main>
    <header class="top">
      <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
      <div class="brand">${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}${escapeHtml(target.title)}</div>
      <div class="folio">Concept 01<br>Editorial authority</div>
    </header>
    <section class="hero">
      <h1>${escapeHtml(hero)}</h1>
      <aside class="note">
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
      </aside>
    </section>
    <section class="ledger">
      <div class="folio">Proof ledger</div>
      <div class="tiles">
        ${proof.slice(0, 3).map((item, index) => `<article class="tile"><b>0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n        ")}
      </div>
    </section>
    <p class="context">${renderConceptContext({ lane, inspiration })}</p>
  </main>`;

  return renderConceptDocument({ lane, target, css, body });
}

function renderCinematicConcept({ lane, target, inspiration, metadata }) {
  const { hero, subhead, cta, assetSrc, proof } = getConceptContent({ lane, target, metadata });
  const css = `    :root { --bg: #111719; --ink: #f3eadc; --muted: #c7bba9; --ember: #e6542f; --blue: #8fb7ff; --line: #ffffff24; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--ink); background: radial-gradient(circle at 52% -6%, #e6542f55, transparent 33rem), radial-gradient(circle at 10% 90%, #8fb7ff24, transparent 26rem), #090b0c; font-family: "Palatino Linotype", Palatino, serif; }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 66px; }
    .back { color: var(--blue); text-decoration: none; font: 800 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .15em; text-transform: uppercase; }
    .screen { min-height: 84vh; display: grid; grid-template-columns: 1.2fr .8fr; gap: 22px; align-items: center; margin-top: 22px; }
    .stage, .monitor { border: 1px solid var(--line); background: linear-gradient(120deg, #ffffff10, transparent); box-shadow: inset 0 0 80px #e6542f14, 0 36px 110px #0009; }
    .stage { padding: clamp(28px, 6vw, 74px); position: relative; overflow: hidden; }
    .stage::after { content: ""; position: absolute; inset: auto -10% -20% 20%; height: 180px; background: radial-gradient(ellipse, #e6542f40, transparent 70%); filter: blur(10px); }
    .eyebrow { color: var(--ember); font: 800 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .2em; text-transform: uppercase; }
    h1 { margin: 18px 0; font-size: clamp(58px, 9vw, 136px); line-height: .82; letter-spacing: -.08em; max-width: 9ch; }
    .deck { max-width: 36rem; color: var(--muted); font-size: clamp(18px, 2vw, 25px); line-height: 1.42; }
    .cta { display: inline-block; margin-top: 20px; padding: 15px 20px; border: 1px solid var(--ember); color: var(--ink); background: #e6542f26; text-decoration: none; text-transform: uppercase; letter-spacing: .13em; font: 800 12px/1 "Trebuchet MS", sans-serif; }
    .monitor { min-height: 520px; padding: 20px; display: grid; align-content: space-between; }
    .monitor img { width: 78px; height: 78px; object-fit: contain; filter: drop-shadow(0 0 24px #e6542f88); }
    .line { border-top: 1px solid var(--line); padding-top: 14px; color: var(--muted); }
    .context { color: var(--muted); font-size: 13px; max-width: 80ch; }
    @media (max-width: 850px) { .screen { grid-template-columns: 1fr; } .monitor { min-height: 320px; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="screen">
      <div class="stage">
        <div class="eyebrow">Concept 02 / Cinematic Signal Room</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
      </div>
      <aside class="monitor">
        ${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : "<span></span>"}
        <div>
          ${proof.slice(0, 3).map((item) => `<p class="line">${escapeHtml(item)}</p>`).join("\n          ")}
        </div>
      </aside>
    </section>
    <p class="context">${renderConceptContext({ lane, inspiration })}</p>
  </main>`;

  return renderConceptDocument({ lane, target, css, body });
}

function renderBrutalistConcept({ lane, target, inspiration, metadata }) {
  const { hero, subhead, cta, assetSrc, proof } = getConceptContent({ lane, target, metadata });
  const css = `    :root { --bg: #ece7d8; --ink: #171816; --acid: #b6d13b; --muted: #52544b; --line: #171816; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Franklin Gothic Medium", "Arial Narrow", sans-serif; }
    main { width: min(1200px, calc(100% - 24px)); margin: 0 auto; padding: 18px 0 64px; }
    .back { display: inline-block; border: 2px solid var(--line); color: var(--ink); padding: 10px 12px; text-decoration: none; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
    .machine { display: grid; grid-template-columns: .55fr 1.45fr; min-height: 84vh; border: 2px solid var(--line); margin-top: 18px; }
    .side { border-right: 2px solid var(--line); background: var(--acid); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
    .side img { width: 76px; height: 76px; object-fit: contain; border: 2px solid var(--line); padding: 8px; background: var(--bg); }
    .label { font-size: 12px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
    .hero { padding: clamp(24px, 5vw, 64px); display: grid; align-content: space-between; min-height: 62vh; }
    h1 { margin: 0; max-width: 9ch; font: 900 clamp(60px, 11vw, 154px)/.77 Impact, "Arial Black", sans-serif; text-transform: uppercase; letter-spacing: -.07em; }
    .deck { max-width: 42rem; color: var(--muted); font-size: clamp(18px, 2vw, 25px); line-height: 1.3; }
    .cta { display: inline-block; width: fit-content; color: var(--bg); background: var(--ink); text-decoration: none; padding: 16px 18px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; box-shadow: 10px 10px 0 var(--acid); }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 2px solid var(--line); }
    .tile { min-height: 160px; border-right: 2px solid var(--line); padding: 16px; background: #f6f0df; }
    .tile:last-child { border-right: 0; }
    .tile b { display: block; margin-bottom: 16px; }
    .context { padding: 16px; border-top: 2px solid var(--line); font-size: 13px; color: var(--muted); }
    @media (max-width: 850px) { .machine, .tiles { grid-template-columns: 1fr; } .side { border-right: 0; border-bottom: 2px solid var(--line); min-height: 220px; } .tile { border-right: 0; border-bottom: 2px solid var(--line); } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="machine">
      <aside class="side">
        <div>${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}<p class="label">Concept 03<br>${escapeHtml(lane.name)}</p></div>
        <p class="label">Direct grid. Clear offer. No ornament pretending to be strategy.</p>
      </aside>
      <div>
        <div class="hero">
          <div>
            <h1>${escapeHtml(hero)}</h1>
            <p class="deck">${escapeHtml(subhead)}</p>
          </div>
          <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
        </div>
        <section class="tiles">
          ${proof.slice(0, 3).map((item, index) => `<article class="tile"><b>0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n          ")}
        </section>
        <p class="context">${renderConceptContext({ lane, inspiration })}</p>
      </div>
    </section>
  </main>`;

  return renderConceptDocument({ lane, target, css, body });
}

function renderAsciiConcept({ lane, target, inspiration, metadata }) {
  const { hero, subhead, cta, assetSrc, proof } = getConceptContent({ lane, target, metadata });
  const css = `    :root { --bg: #08100d; --ink: #e8f3e5; --signal: #44c7a1; --hot: #f4773f; --muted: #9fb7a8; --line: #44c7a144; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--ink); background: radial-gradient(circle at 15% 12%, #1f5a42, transparent 27rem), radial-gradient(circle at 82% 5%, #562515, transparent 25rem), var(--bg); font-family: "Courier New", monospace; }
    body::before { content: ""; position: fixed; inset: 0; opacity: .16; pointer-events: none; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 28px 28px; }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 68px; }
    .back { color: var(--signal); text-decoration: none; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; font-size: 12px; }
    .console { min-height: 88vh; display: grid; grid-template-columns: .82fr 1.18fr; gap: 18px; align-items: stretch; margin-top: 26px; }
    .rail, .stage, .module { border: 1px solid var(--line); background: #07120ed9; box-shadow: 0 0 0 1px #000, 0 30px 90px #0008; }
    .rail { padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 12px; color: var(--signal); letter-spacing: .15em; text-transform: uppercase; font-size: 12px; }
    .brand img { width: 58px; height: 58px; object-fit: contain; border: 1px solid var(--line); padding: 8px; background: #e8f3e50d; }
    pre { margin: 0; color: var(--signal); font: 12px/1.08 "Courier New", monospace; white-space: pre-wrap; }
    .stage { position: relative; padding: clamp(24px, 4vw, 58px); overflow: hidden; }
    .stage::before { content: "CONCEPT / ASCII / COMMAND_THEATER"; position: absolute; top: 18px; right: -60px; color: #44c7a155; transform: rotate(34deg); letter-spacing: .23em; font-size: 11px; }
    .eyebrow { color: var(--hot); letter-spacing: .18em; text-transform: uppercase; font-size: 12px; }
    h1 { margin: 20px 0 24px; font-size: clamp(48px, 8vw, 116px); line-height: .84; letter-spacing: -.08em; font-family: "Arial Black", Impact, sans-serif; text-transform: uppercase; }
    .deck { color: var(--muted); font-size: clamp(16px, 2vw, 22px); line-height: 1.45; max-width: 38rem; }
    .cta { display: inline-block; margin-top: 22px; padding: 16px 18px; color: #07120e; background: var(--signal); text-decoration: none; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; box-shadow: 8px 8px 0 var(--hot); }
    .stack { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
    .module { min-height: 170px; padding: 16px; }
    .module b { display: block; margin-bottom: 12px; color: var(--hot); letter-spacing: .16em; font-size: 12px; }
    .context { margin-top: 18px; color: var(--muted); font-size: 13px; }
    @media (max-width: 850px) { .console, .stack { grid-template-columns: 1fr; } h1 { font-family: Impact, sans-serif; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="console">
      <aside class="rail">
        <div class="brand">${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}<span>${escapeHtml(target.title)}</span></div>
        <pre>+----------------------+
| CONCEPT 04           |
| TARGET  : LOCKED     |
| MEMORY  : ONLINE     |
| STYLE   : ASCII      |
+----------------------+

MODE COMMAND THEATER
CHOICE HIGH CONTRAST
OUTPUT MEMORABLE</pre>
      </aside>
      <div class="stage">
        <div class="eyebrow">${escapeHtml(lane.name)} / concept preview</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
      </div>
    </section>
    <section class="stack">
      ${proof.slice(0, 3).map((item, index) => `<article class="module"><b>CMD 0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n      ")}
    </section>
    <p class="context">${renderConceptContext({ lane, inspiration })}</p>
  </main>`;

  return renderConceptDocument({ lane, target, css, body });
}

function renderCraftConcept({ lane, target, inspiration, metadata }) {
  const { hero, subhead, cta, assetSrc, proof } = getConceptContent({ lane, target, metadata });
  const css = `    :root { --clay: #f2eadc; --ink: #2b2119; --copper: #bc6f46; --sage: #64765c; --cream: #fff7ea; --line: #2b211924; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 18% 15%, #bc6f4640, transparent 25rem), radial-gradient(circle at 84% 20%, #64765c33, transparent 30rem), var(--clay); font-family: Cochin, Georgia, serif; }
    main { width: min(1160px, calc(100% - 34px)); margin: 0 auto; padding: 28px 0 68px; }
    .back { color: var(--sage); text-decoration: none; font: 800 12px/1 "Gill Sans", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .garden { min-height: 86vh; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; }
    .blob { padding: clamp(26px, 5vw, 58px); background: var(--cream); border: 1px solid var(--line); border-radius: 46% 54% 42% 58% / 55% 38% 62% 45%; box-shadow: 0 40px 100px #4b2b161f; }
    .blob img { width: 72px; height: 72px; object-fit: contain; margin-bottom: 24px; }
    .eyebrow { color: var(--copper); font: 800 12px/1 "Gill Sans", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    h1 { font-size: clamp(54px, 9vw, 128px); line-height: .84; letter-spacing: -.07em; margin: 18px 0; }
    .deck { color: #584739; font-size: clamp(18px, 2vw, 24px); line-height: 1.45; }
    .cta { display: inline-block; margin-top: 20px; padding: 15px 20px; color: var(--cream); background: var(--copper); border-radius: 999px; text-decoration: none; text-transform: uppercase; letter-spacing: .12em; font: 800 12px/1 "Gill Sans", sans-serif; }
    .cards { display: grid; gap: 14px; transform: rotate(-2deg); }
    .card { min-height: 150px; padding: 22px; background: #fff7ea99; border: 1px solid var(--line); border-radius: 28px; box-shadow: 0 22px 70px #4b2b1617; }
    .card:nth-child(even) { transform: translateX(28px) rotate(3deg); }
    .card b { display: block; color: var(--sage); margin-bottom: 12px; font: 800 12px/1 "Gill Sans", sans-serif; letter-spacing: .14em; }
    .context { color: #665747; font-size: 13px; max-width: 80ch; }
    @media (max-width: 850px) { .garden { grid-template-columns: 1fr; } .cards, .card:nth-child(even) { transform: none; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="garden">
      <div class="blob">
        ${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}
        <div class="eyebrow">Concept 05 / Organic Premium Craft</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
      </div>
      <aside class="cards">
        ${proof.slice(0, 3).map((item, index) => `<article class="card"><b>Layer 0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n        ")}
      </aside>
    </section>
    <p class="context">${renderConceptContext({ lane, inspiration })}</p>
  </main>`;

  return renderConceptDocument({ lane, target, css, body });
}

function renderLegacyConceptHtml({ lane, target, inspiration, metadata }) {
  const hero = target.headings.find((heading) => heading.level === 1)?.text ?? target.title;
  const subhead = target.description || target.headings.slice(1, 3).map((heading) => heading.text).join(" ");
  const cta = target.ctas[0] ?? target.navigationLinks[0] ?? { text: "Explore", href: target.metadata.url };
  const proof = target.headings.slice(0, 6);
  const asset = metadata.assetReuse.find((item) => item.localPath);
  const assetSrc = asset ? `../../${asset.localPath.replace(/\\/g, "/")}` : null;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(lane.name)} | ${escapeHtml(target.title)}</title>
  <style>
    :root {
      --bg: ${lane.background};
      --ink: ${lane.ink};
      --accent: ${lane.accent};
      --muted: color-mix(in srgb, var(--ink) 68%, var(--bg));
      --panel: color-mix(in srgb, var(--bg) 86%, var(--accent));
      --line: color-mix(in srgb, var(--ink) 22%, transparent);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 30rem),
        linear-gradient(135deg, var(--bg), color-mix(in srgb, var(--bg) 82%, var(--ink)));
      font-family: Georgia, "Iowan Old Style", serif;
    }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
    .topline { display: flex; justify-content: space-between; gap: 18px; align-items: center; margin-bottom: 54px; }
    .back { color: var(--accent); text-decoration: none; font: 700 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .mark { display: inline-flex; align-items: center; gap: 12px; font: 700 14px/1.1 "Trebuchet MS", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    .mark img { width: 54px; height: 54px; object-fit: contain; border: 1px solid var(--line); border-radius: 50%; padding: 8px; background: var(--panel); }
    .lane { border: 1px solid var(--line); padding: 10px 14px; border-radius: 999px; color: var(--muted); font: 12px/1.1 "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 44px; align-items: end; min-height: 58vh; }
    h1 { font-size: clamp(48px, 8vw, 116px); line-height: .88; margin: 0; letter-spacing: -.07em; max-width: 10ch; }
    .deck { font-size: clamp(18px, 2vw, 25px); line-height: 1.42; color: var(--muted); margin: 0 0 26px; }
    .cta { display: inline-block; color: var(--bg); background: var(--ink); text-decoration: none; padding: 15px 20px; border-radius: 999px; font: 700 13px/1 "Trebuchet MS", sans-serif; letter-spacing: .12em; text-transform: uppercase; }
    .panel { border: 1px solid var(--line); background: color-mix(in srgb, var(--panel) 82%, transparent); padding: 24px; border-radius: ${lane.id === "concept-03" || lane.id === "concept-04" ? "0" : "28px"}; box-shadow: 0 28px 80px color-mix(in srgb, var(--ink) 12%, transparent); }
    .ascii { white-space: pre; font: 11px/1.05 "Courier New", monospace; color: var(--accent); overflow: hidden; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 44px; }
    .tile { min-height: 150px; border: 1px solid var(--line); padding: 18px; background: color-mix(in srgb, var(--bg) 72%, var(--accent)); }
    .tile b { display: block; font: 700 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 14px; }
    .inspiration { margin-top: 32px; color: var(--muted); font-size: 14px; max-width: 72ch; }
    @media (max-width: 780px) {
      .hero, .grid { grid-template-columns: 1fr; }
      .topline { align-items: flex-start; flex-direction: column; }
      h1 { max-width: none; }
    }
  </style>
</head>
<body>
  <main>
    <header class="topline">
      <div class="mark">${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}<span>${escapeHtml(target.title)}</span></div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a><div class="lane">${escapeHtml(lane.name)}</div></div>
    </header>
    <section class="hero">
      <div>
        <h1>${escapeHtml(hero)}</h1>
      </div>
      <aside class="panel">
        ${lane.id === "concept-04" ? `<pre class="ascii">╔══════════════════╗
║  SIGNAL ONLINE  ║
║  FIVE LANES     ║
║  TARGET LOCKED  ║
╚══════════════════╝</pre>` : ""}
        <p class="deck">${escapeHtml(subhead || lane.tone)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Explore")}</a>
      </aside>
    </section>
    <section class="grid" aria-label="Concept structure">
      ${proof.slice(0, 3).map((heading, index) => `<article class="tile"><b>0${index + 1}</b>${escapeHtml(heading.text)}</article>`).join("\n      ")}
      ${proof.length < 3 ? `<article class="tile"><b>01</b>${escapeHtml(lane.structure)}</article><article class="tile"><b>02</b>${escapeHtml(lane.tone)}</article><article class="tile"><b>03</b>Built from target content and memory techniques.</article>` : ""}
    </section>
    <p class="inspiration">Inspiration influence: ${escapeHtml(inspiration?.title ?? "none")}. Direction only, never copied. Memory lane: ${escapeHtml(lane.query)}.</p>
  </main>
</body>
</html>
`;
}

function renderGallery({ target, concepts }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AutoWeb Concepts | ${escapeHtml(target.title)}</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #eee7da; color: #1f1b16; }
    main { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0; }
    h1 { font-size: clamp(42px, 8vw, 92px); line-height: .9; margin: 0 0 22px; letter-spacing: -.06em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 34px; }
    a { min-height: 180px; display: flex; flex-direction: column; justify-content: space-between; color: inherit; text-decoration: none; border: 1px solid #30282033; padding: 18px; background: #f8f2e8; }
    span { font: 700 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #7d5f3a; }
    b { font-size: 24px; }
  </style>
</head>
<body>
  <main>
    <h1>Five redesign directions</h1>
    <p>Target: ${escapeHtml(target.title)}. Choose two finalists for cinematic upgrade.</p>
    <section class="grid">
      ${concepts.map((concept) => `<a href="./${concept.id}/index.html"><span>${concept.id}</span><b>${escapeHtml(concept.name)}</b><small>Open concept</small></a>`).join("\n      ")}
    </section>
  </main>
</body>
</html>
`;
}

function selectAssets(assets) {
  const downloaded = (assets ?? []).filter((asset) => asset.status === "downloaded" && asset.localPath);
  const logos = downloaded.filter((asset) => asset.type === "logo" || asset.label?.toLowerCase().includes("logo"));
  return [...logos, ...downloaded].slice(0, 3);
}
