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
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><a class="back" href="/">Back to dashboard</a><div class="lane">${escapeHtml(lane.name)}</div></div>
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
