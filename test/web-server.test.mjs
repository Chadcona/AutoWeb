import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDashboardServer } from "../src/web/server.mjs";

test("dashboard server serves app shell and status API", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "autoweb-dashboard-"));
  const dashboard = createDashboardServer({ rootDir, port: 0 });

  try {
    await new Promise((resolve) => dashboard.server.listen(0, "127.0.0.1", resolve));
    const address = dashboard.server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const html = await fetchText(`${baseUrl}/`);
    const status = await fetchJson(`${baseUrl}/api/status`);

    assert.match(html, /AutoWeb Cockpit/);
    assert.equal(status.memoryEntries, 0);
    assert.deepEqual(status.runs, []);
  } finally {
    await new Promise((resolve) => dashboard.server.close(resolve));
    await rm(rootDir, { recursive: true, force: true });
  }
});

async function fetchText(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}
