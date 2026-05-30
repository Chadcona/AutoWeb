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
      runId,
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
  const conceptId = metadata.sourceConcept ?? metadata.id;
  const renderers = {
    "concept-01": renderEditorialFinalist,
    "concept-02": renderSignalRoomFinalist,
    "concept-03": renderOperatorFinalist,
    "concept-04": renderAsciiFinalist,
    "concept-05": renderCraftFinalist
  };
  const renderer = renderers[conceptId] ?? renderSignalRoomFinalist;
  return renderer({ metadata, target });
}

function getFinalistContent({ metadata, target }) {
  const hero = target.headings.find((heading) => heading.level === 1)?.text ?? target.title;
  const subhead = target.description || target.headings.slice(1, 3).map((heading) => heading.text).join(" ");
  const cta = target.ctas[0] ?? { text: "Begin", href: target.metadata.url };
  const source = metadata.assetReuse?.find((asset) => asset.localPath);
  const assetSrc = source ? `../../${source.localPath.replace(/\\/g, "/")}` : null;
  const fallbackProof = [
    metadata.lane.structure,
    metadata.lane.tone,
    "Built from target content, source assets, and memory techniques."
  ];
  const proof = [
    ...target.headings.slice(0, 5).map((heading) => heading.text),
    ...fallbackProof
  ];

  return {
    hero,
    subhead: subhead || metadata.lane.tone,
    cta,
    assetSrc,
    proof: [...new Set(proof)].slice(0, 5)
  };
}

function renderDocument({ metadata, target, css, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metadata.name)} Finalist | ${escapeHtml(target.title)}</title>
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

function renderEditorialFinalist({ metadata, target }) {
  const { hero, subhead, cta, assetSrc, proof } = getFinalistContent({ metadata, target });
  const css = `    :root { --paper: #f4efe4; --ink: #211a14; --muted: #6e6255; --line: #2a201733; --gold: #8c6c3f; --bone: #fffaf0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 78% 12%, #d8c59d77, transparent 27rem), linear-gradient(120deg, var(--paper), #ebe1cf); font-family: Georgia, "Iowan Old Style", serif; }
    body::before { content: ""; position: fixed; inset: 18px; pointer-events: none; border: 1px solid var(--line); }
    main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: 30px 0 72px; }
    .back { position: fixed; top: 28px; left: 34px; z-index: 2; color: var(--gold); text-decoration: none; font: 700 11px/1 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .16em; text-transform: uppercase; }
    .masthead { display: grid; grid-template-columns: .75fr 1.5fr .75fr; gap: 22px; align-items: center; padding: 56px 0 26px; border-bottom: 1px solid var(--line); animation: reveal .7s cubic-bezier(.22,1,.36,1) both; }
    .folio { color: var(--muted); font: 700 11px/1.4 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    .brand { text-align: center; font-size: clamp(26px, 4vw, 58px); line-height: .9; letter-spacing: -.06em; }
    .brand img { width: 58px; height: 58px; object-fit: contain; display: block; margin: 0 auto 12px; padding: 8px; border: 1px solid var(--line); border-radius: 50%; background: var(--bone); }
    .hero { display: grid; grid-template-columns: 1.05fr .95fr; gap: 48px; align-items: center; min-height: 52vh; padding: 46px 0; }
    h1 { margin: 0; font-size: clamp(58px, 8vw, 124px); line-height: .78; letter-spacing: -.09em; max-width: 9ch; animation: rise .8s .08s cubic-bezier(.22,1,.36,1) both; }
    .editor-note { padding: 28px; background: #fff8ea99; border-left: 6px solid var(--gold); box-shadow: 0 30px 90px #4a33151a; animation: rise .8s .18s cubic-bezier(.22,1,.36,1) both; }
    .deck { color: var(--muted); font-size: clamp(18px, 2vw, 25px); line-height: 1.42; margin: 0 0 24px; }
    .cta { display: inline-block; color: var(--bone); background: var(--ink); text-decoration: none; padding: 15px 20px; border-radius: 999px; font: 700 12px/1 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .ledger { display: grid; grid-template-columns: .6fr 1.4fr; gap: 18px; border-top: 1px solid var(--line); padding-top: 26px; }
    .ledger-title { color: var(--gold); font: 700 12px/1 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    .proofs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .proof { min-height: 160px; padding: 20px; border: 1px solid var(--line); background: #fffaf066; animation: rise .7s cubic-bezier(.22,1,.36,1) both; }
    .proof b { display: block; margin-bottom: 18px; color: var(--gold); font: 700 12px/1 "Gill Sans", "Trebuchet MS", sans-serif; letter-spacing: .18em; }
    .proof:nth-child(2) { animation-delay: .1s; }
    .proof:nth-child(3) { animation-delay: .2s; }
    @keyframes reveal { from { opacity: 0; clip-path: inset(0 50% 0 50%); } to { opacity: 1; clip-path: inset(0); } }
    @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 820px) { body::before { inset: 10px; } .back { position: static; display: inline-block; margin-top: 18px; } .masthead, .hero, .ledger, .proofs { grid-template-columns: 1fr; } .brand { text-align: left; } h1 { max-width: none; } }
    @media (prefers-reduced-motion: reduce) { *, body::before { animation: none !important; scroll-behavior: auto !important; } }`;
  const body = `  <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
  <main>
    <header class="masthead">
      <div class="folio">Finalist upgrade<br>${escapeHtml(metadata.sourceConcept)}</div>
      <div class="brand">${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}${escapeHtml(target.title)}</div>
      <div class="folio">Editorial authority<br>Measured whitespace</div>
    </header>
    <section class="hero">
      <h1>${escapeHtml(hero)}</h1>
      <aside class="editor-note">
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
      </aside>
    </section>
    <section class="ledger">
      <div class="ledger-title">Proof ledger</div>
      <div class="proofs">
        ${proof.slice(0, 3).map((item, index) => `<article class="proof"><b>0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n        ")}
      </div>
    </section>
  </main>`;

  return renderDocument({ metadata, target, css, body });
}

function renderAsciiFinalist({ metadata, target }) {
  const { hero, subhead, cta, assetSrc, proof } = getFinalistContent({ metadata, target });
  const css = `    :root { --bg: #08100d; --ink: #e8f7df; --muted: #9eb8a4; --signal: #51f0ae; --hot: #f4773f; --line: #71ffbd33; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--ink); background: radial-gradient(circle at 16% 18%, #1f5a42, transparent 26rem), radial-gradient(circle at 82% 4%, #562515, transparent 24rem), var(--bg); font-family: "Courier New", monospace; overflow-x: hidden; }
    body::before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .16; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 28px 28px; animation: scan 12s linear infinite; }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 70px; position: relative; }
    .back { color: var(--signal); text-decoration: none; font: 700 12px/1 "Courier New", monospace; letter-spacing: .14em; text-transform: uppercase; }
    .console { min-height: 92vh; display: grid; grid-template-columns: .82fr 1.18fr; gap: 18px; align-items: stretch; margin-top: 26px; }
    .rail, .stage, .module { border: 1px solid var(--line); background: #07120ecf; box-shadow: 0 0 0 1px #000, 0 30px 90px #0008; }
    .rail { display: flex; flex-direction: column; justify-content: space-between; padding: 18px; animation: boot .7s cubic-bezier(.22,1,.36,1) both; }
    .brand { display: flex; align-items: center; gap: 12px; color: var(--signal); letter-spacing: .16em; text-transform: uppercase; font-size: 12px; }
    .brand img { width: 58px; height: 58px; object-fit: contain; border: 1px solid var(--line); padding: 8px; background: #e8f7df0d; }
    pre { margin: 0; color: var(--signal); font: 12px/1.08 "Courier New", monospace; white-space: pre-wrap; }
    .stage { position: relative; padding: clamp(24px, 4vw, 58px); overflow: hidden; animation: boot .8s .12s cubic-bezier(.22,1,.36,1) both; }
    .stage::before { content: "AUTO_WEB / FINALIST / COMMAND_THEATER"; position: absolute; top: 16px; right: -72px; color: #51f0ae44; transform: rotate(35deg); letter-spacing: .24em; font-size: 11px; }
    .eyebrow { color: var(--hot); letter-spacing: .18em; text-transform: uppercase; font-size: 12px; }
    h1 { margin: 20px 0 24px; font-size: clamp(46px, 8vw, 116px); line-height: .84; letter-spacing: -.08em; font-family: "Arial Black", Impact, sans-serif; text-transform: uppercase; }
    .deck { max-width: 38rem; color: var(--muted); font-size: clamp(16px, 2vw, 22px); line-height: 1.45; }
    .cta { display: inline-block; margin-top: 22px; padding: 16px 18px; color: #07120e; background: var(--signal); text-decoration: none; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; box-shadow: 8px 8px 0 var(--hot); }
    .stack { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
    .module { min-height: 170px; padding: 16px; animation: rise .7s cubic-bezier(.22,1,.36,1) both; }
    .module b { display: block; margin-bottom: 12px; color: var(--hot); letter-spacing: .16em; font-size: 12px; }
    .module:nth-child(2) { animation-delay: .1s; }
    .module:nth-child(3) { animation-delay: .2s; }
    @keyframes boot { from { opacity: 0; transform: translateY(14px) scale(.98); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
    @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scan { to { transform: translateY(28px); } }
    @media (max-width: 850px) { .console, .stack { grid-template-columns: 1fr; } h1 { font-family: Impact, sans-serif; } }
    @media (prefers-reduced-motion: reduce) { *, body::before { animation: none !important; scroll-behavior: auto !important; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="console">
      <aside class="rail">
        <div class="brand">${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}<span>${escapeHtml(target.title)}</span></div>
        <pre>+----------------------+
| AUTOWEB FINALIST     |
| MEMORY  : ONLINE     |
| MOTION  : ARMED      |
| ASCII   : SIGNALING  |
+----------------------+

RUN ${escapeHtml(metadata.sourceConcept)}
MODE COMMAND THEATER
OUTPUT HIGH-END PAGE</pre>
      </aside>
      <div class="stage">
        <div class="eyebrow">${escapeHtml(metadata.name)} / live upgrade</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
      </div>
    </section>
    <section class="stack">
      ${proof.slice(0, 3).map((item, index) => `<article class="module"><b>CMD 0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n      ")}
    </section>
  </main>`;

  return renderDocument({ metadata, target, css, body });
}

function renderSignalRoomFinalist({ metadata, target }) {
  const { hero, subhead, cta, assetSrc, proof } = getFinalistContent({ metadata, target });
  const css = `    :root { --bg: #111517; --ink: #f5eadb; --muted: #cbbca8; --ember: #ed5d35; --blue: #8eb8ff; --line: #ffffff24; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 50% -10%, #ed5d3544, transparent 34rem), linear-gradient(140deg, #090b0c, var(--bg)); font-family: "Palatino Linotype", Palatino, serif; }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 72px; }
    .back { color: var(--blue); text-decoration: none; font: 700 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .15em; text-transform: uppercase; }
    .screen { min-height: 86vh; display: grid; grid-template-columns: 1.15fr .85fr; gap: 24px; align-items: center; }
    .beam { padding: clamp(28px, 6vw, 72px); border: 1px solid var(--line); background: linear-gradient(120deg, #ffffff10, transparent); box-shadow: inset 0 0 80px #ed5d3514, 0 40px 120px #0008; animation: cue .85s cubic-bezier(.22,1,.36,1) both; }
    .eyebrow { color: var(--ember); font: 700 12px/1 "Trebuchet MS", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    h1 { font-size: clamp(56px, 9vw, 132px); line-height: .82; letter-spacing: -.08em; margin: 18px 0; }
    .deck { color: var(--muted); font-size: clamp(18px, 2vw, 25px); line-height: 1.42; max-width: 34rem; }
    .cta { display: inline-block; margin-top: 20px; padding: 15px 20px; color: var(--ink); border: 1px solid var(--ember); text-decoration: none; background: #ed5d3526; text-transform: uppercase; letter-spacing: .12em; font: 700 12px/1 "Trebuchet MS", sans-serif; }
    .monitor { border: 1px solid var(--line); background: #060707cc; padding: 20px; min-height: 500px; display: grid; align-content: space-between; animation: cue .85s .16s cubic-bezier(.22,1,.36,1) both; }
    .monitor img { width: 80px; height: 80px; object-fit: contain; filter: drop-shadow(0 0 24px #ed5d3588); }
    .readout { display: grid; gap: 12px; }
    .line { border-top: 1px solid var(--line); padding-top: 14px; color: var(--muted); }
    @keyframes cue { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 840px) { .screen { grid-template-columns: 1fr; } .monitor { min-height: 320px; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; scroll-behavior: auto !important; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="screen">
      <div class="beam">
        <div class="eyebrow">${escapeHtml(metadata.name)} / cinematic signal room</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
      </div>
      <aside class="monitor">
        ${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : "<span></span>"}
        <div class="readout">
          ${proof.slice(0, 3).map((item) => `<div class="line">${escapeHtml(item)}</div>`).join("\n          ")}
        </div>
      </aside>
    </section>
  </main>`;

  return renderDocument({ metadata, target, css, body });
}

function renderOperatorFinalist({ metadata, target }) {
  const { hero, subhead, cta, assetSrc, proof } = getFinalistContent({ metadata, target });
  const css = `    :root { --bg: #ebe6d6; --ink: #141512; --acid: #bedb39; --line: #141512; --muted: #56584e; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Franklin Gothic Medium", "Arial Narrow", sans-serif; }
    main { width: min(1200px, calc(100% - 24px)); margin: 0 auto; padding: 18px 0 64px; }
    .back { display: inline-block; color: var(--ink); text-decoration: none; border: 2px solid var(--line); padding: 10px 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .grid { display: grid; grid-template-columns: .62fr 1.38fr; border: 2px solid var(--line); margin-top: 18px; min-height: 82vh; }
    .side { border-right: 2px solid var(--line); padding: 18px; background: var(--acid); display: flex; flex-direction: column; justify-content: space-between; }
    .side img { width: 76px; height: 76px; object-fit: contain; border: 2px solid var(--line); padding: 8px; background: var(--bg); }
    .label { font-size: 12px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    .hero { padding: clamp(24px, 5vw, 64px); display: grid; align-content: space-between; }
    h1 { margin: 0; max-width: 9ch; font: 900 clamp(58px, 11vw, 150px)/.78 Impact, "Arial Black", sans-serif; text-transform: uppercase; letter-spacing: -.07em; animation: slam .55s cubic-bezier(.22,1,.36,1) both; }
    .deck { max-width: 42rem; font-size: clamp(18px, 2vw, 25px); line-height: 1.3; color: var(--muted); }
    .cta { display: inline-block; width: fit-content; color: var(--bg); background: var(--ink); text-decoration: none; padding: 16px 18px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; box-shadow: 10px 10px 0 var(--acid); }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); border-left: 2px solid var(--line); border-bottom: 2px solid var(--line); }
    .tile { min-height: 160px; border-top: 2px solid var(--line); border-right: 2px solid var(--line); padding: 16px; background: #f6f0df; }
    .tile b { display: block; margin-bottom: 18px; }
    @keyframes slam { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
    @media (max-width: 840px) { .grid, .tiles { grid-template-columns: 1fr; } .side { border-right: 0; border-bottom: 2px solid var(--line); min-height: 220px; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; scroll-behavior: auto !important; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="grid">
      <aside class="side">
        <div>${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}<p class="label">${escapeHtml(metadata.name)}</p></div>
        <p class="label">No softness. Clear system. Fast decision path.</p>
      </aside>
      <div>
        <div class="hero">
          <div>
            <h1>${escapeHtml(hero)}</h1>
            <p class="deck">${escapeHtml(subhead)}</p>
          </div>
          <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
        </div>
        <section class="tiles">
          ${proof.slice(0, 3).map((item, index) => `<article class="tile"><b>0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n          ")}
        </section>
      </div>
    </section>
  </main>`;

  return renderDocument({ metadata, target, css, body });
}

function renderCraftFinalist({ metadata, target }) {
  const { hero, subhead, cta, assetSrc, proof } = getFinalistContent({ metadata, target });
  const css = `    :root { --clay: #efe1cf; --ink: #2d2118; --copper: #b96e43; --sage: #66755b; --cream: #fff7ea; --line: #2d211824; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: radial-gradient(circle at 20% 12%, #b96e4340, transparent 24rem), radial-gradient(circle at 80% 18%, #66755b33, transparent 28rem), var(--clay); font-family: Cochin, Georgia, serif; }
    main { width: min(1160px, calc(100% - 34px)); margin: 0 auto; padding: 28px 0 72px; }
    .back { color: var(--sage); text-decoration: none; font: 700 12px/1 "Gill Sans", sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .hero { min-height: 86vh; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; }
    .blob { position: relative; padding: clamp(26px, 5vw, 58px); background: var(--cream); border: 1px solid var(--line); border-radius: 46% 54% 42% 58% / 55% 38% 62% 45%; box-shadow: 0 40px 100px #4b2b161f; animation: breathe 7s ease-in-out infinite; }
    .blob img { width: 72px; height: 72px; object-fit: contain; margin-bottom: 26px; }
    .eyebrow { color: var(--copper); font: 700 12px/1 "Gill Sans", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
    h1 { font-size: clamp(54px, 9vw, 128px); line-height: .84; letter-spacing: -.07em; margin: 18px 0; }
    .deck { color: #584739; font-size: clamp(18px, 2vw, 24px); line-height: 1.45; }
    .cta { display: inline-block; margin-top: 20px; padding: 15px 20px; color: var(--cream); background: var(--copper); border-radius: 999px; text-decoration: none; text-transform: uppercase; letter-spacing: .12em; font: 700 12px/1 "Gill Sans", sans-serif; }
    .cards { display: grid; gap: 14px; transform: rotate(-2deg); }
    .card { padding: 22px; min-height: 150px; background: #fff7ea99; border: 1px solid var(--line); border-radius: 28px; box-shadow: 0 22px 70px #4b2b1617; }
    .card:nth-child(even) { transform: translateX(28px) rotate(3deg); }
    .card b { display: block; color: var(--sage); margin-bottom: 12px; font: 700 12px/1 "Gill Sans", sans-serif; letter-spacing: .14em; }
    @keyframes breathe { 50% { border-radius: 54% 46% 58% 42% / 42% 56% 44% 58%; transform: translateY(-6px); } }
    @media (max-width: 840px) { .hero { grid-template-columns: 1fr; } .cards, .card:nth-child(even) { transform: none; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; scroll-behavior: auto !important; } }`;
  const body = `  <main>
    <a class="back" href="/?run=${encodeURIComponent(metadata.runId)}">Back to dashboard</a>
    <section class="hero">
      <div class="blob">
        ${assetSrc ? `<img src="${escapeHtml(assetSrc)}" alt="">` : ""}
        <div class="eyebrow">${escapeHtml(metadata.name)} / tactile premium</div>
        <h1>${escapeHtml(hero)}</h1>
        <p class="deck">${escapeHtml(subhead)}</p>
        <a class="cta" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text || "Begin")}</a>
      </div>
      <aside class="cards">
        ${proof.slice(0, 3).map((item, index) => `<article class="card"><b>Layer 0${index + 1}</b>${escapeHtml(item)}</article>`).join("\n        ")}
      </aside>
    </section>
  </main>`;

  return renderDocument({ metadata, target, css, body });
}
