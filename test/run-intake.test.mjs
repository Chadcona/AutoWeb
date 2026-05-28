import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { analyzeHtml, createRun } from "../src/run/intake.mjs";

test("analyzeHtml extracts structure, CTAs, and asset candidates", () => {
  const analysis = analyzeHtml(
    `<!doctype html>
    <html>
      <head>
        <title>Studio Example</title>
        <meta name="description" content="Premium cinematic design studio">
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <nav><a href="/work">Work</a><a href="/contact">Contact</a></nav>
        <h1>Bold cinematic websites</h1>
        <a href="/book">Book now</a>
        <button>Start project</button>
        <img src="/logo.svg" alt="Studio logo">
        <svg viewBox="0 0 10 10"></svg>
      </body>
    </html>`,
    "https://example.com"
  );

  assert.equal(analysis.title, "Studio Example");
  assert.equal(analysis.description, "Premium cinematic design studio");
  assert.equal(analysis.headings[0].text, "Bold cinematic websites");
  assert.equal(analysis.navigationLinks.length, 2);
  assert.equal(analysis.ctas.length, 3);
  assert.equal(analysis.images[0].url, "https://example.com/logo.svg");
  assert.equal(analysis.svgAssets.length, 2);
  assert.equal(analysis.stylesheets[0].url, "https://example.com/style.css");
  assert(analysis.moodSignals.some((signal) => signal.includes("cinematic")));
});

test("createRun writes target and inspiration briefs separately", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "web-builder-run-"));
  const server = http.createServer((request, response) => {
    if (request.url === "/inspiration") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(`<!doctype html><title>Inspiration</title><h1>Immersive motion studio</h1>`);
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html>
      <title>Target Site</title>
      <meta name="description" content="Local service business">
      <nav><a href="/services">Services</a></nav>
      <h1>Make the room feel alive</h1>
      <a href="/contact">Contact us</a>
      <img src="/brand.png" alt="Brand mark">`);
  });

  try {
    const baseUrl = await listen(server);
    const result = await createRun({
      rootDir,
      targetUrl: baseUrl,
      inspirationUrl: `${baseUrl}/inspiration`,
      name: "Test Run"
    });

    const input = JSON.parse(await readFile(result.files.input, "utf8"));
    const targetBrief = await readFile(result.files.targetBrief, "utf8");
    const inspirationBrief = await readFile(result.files.inspirationBrief, "utf8");

    assert.match(result.runId, /test-run$/);
    assert.equal(input.target.title, "Target Site");
    assert.equal(input.inspiration.title, "Inspiration");
    assert.match(targetBrief, /# Target Site Brief/);
    assert.match(targetBrief, /Brand mark/);
    assert.match(inspirationBrief, /# Inspiration Site Brief/);
    assert.match(inspirationBrief, /Do not copy its brand/);
  } finally {
    server.close();
    await rm(rootDir, { recursive: true, force: true });
  }
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
