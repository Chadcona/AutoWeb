const state = {
  runs: [],
  currentRun: null,
  selectedConcepts: new Set()
};

const els = {
  memoryCount: document.querySelector("#memory-count"),
  memoryDate: document.querySelector("#memory-date"),
  runForm: document.querySelector("#run-form"),
  runsList: document.querySelector("#runs-list"),
  refreshRuns: document.querySelector("#refresh-runs"),
  importMemory: document.querySelector("#import-memory"),
  currentRunTitle: document.querySelector("#current-run-title"),
  targetBriefLink: document.querySelector("#target-brief-link"),
  actionBanner: document.querySelector("#action-banner"),
  conceptGrid: document.querySelector("#concept-grid"),
  selectFinalists: document.querySelector("#select-finalists"),
  upgradeFinalistsSecondary: document.querySelector("#upgrade-finalists-secondary"),
  finalistLinks: document.querySelector("#finalist-links"),
  log: document.querySelector("#log")
};

await refreshStatus();

els.runForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.runForm);
  await action("Creating run", async () => {
    const data = await postJson("/api/runs/new", {
      targetUrl: form.get("targetUrl"),
      inspirationUrl: form.get("inspirationUrl"),
      name: form.get("name")
    });
    state.currentRun = data.run;
    state.selectedConcepts.clear();
    await refreshStatus();
    renderCurrentRun();
    return `Created ${data.runId}`;
  });
});

els.refreshRuns.addEventListener("click", refreshStatus);
els.importMemory.addEventListener("click", async () => {
  await action("Importing memory", async () => {
    const data = await postJson("/api/memory/import", {});
    await refreshStatus();
    return `Imported ${data.entries} entries`;
  });
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!state.currentRun) {
      writeLog("Select or create a run first.");
      return;
    }

    const runId = state.currentRun.runId;
    const type = button.dataset.action;
    const route = `/api/runs/${encodeURIComponent(runId)}/${type}`;
    await action(`Running ${type}`, async () => {
      const data = await postJson(route, {});
      state.currentRun = data.run;
      if (type === "concepts") state.selectedConcepts.clear();
      renderCurrentRun();
      return `${type} complete`;
    });
  });
});

els.upgradeFinalistsSecondary.addEventListener("click", async () => {
  if (!state.currentRun) {
    writeLog("Select or create a run first.");
    return;
  }

  await runStep("upgrade");
});

els.selectFinalists.addEventListener("click", async () => {
  if (!state.currentRun) {
    writeLog("Select or create a run first.");
    return;
  }

  const conceptIds = [...state.selectedConcepts];
  if (conceptIds.length !== 2) {
    writeLog("Select exactly two concepts first.");
    return;
  }

  await action("Selecting finalists", async () => {
    const data = await postJson(`/api/runs/${encodeURIComponent(state.currentRun.runId)}/select`, { conceptIds });
    state.currentRun = data.run;
    renderCurrentRun();
    return `Selected ${conceptIds.join(" and ")}`;
  });
});

async function refreshStatus() {
  const status = await getJson("/api/status");
  state.runs = status.runs;
  els.memoryCount.textContent = status.memoryEntries;
  els.memoryDate.textContent = status.memoryGeneratedAt
    ? `Updated ${new Date(status.memoryGeneratedAt).toLocaleString()}`
    : "Run Import Memory to build the index";
  renderRuns();
}

async function runStep(type) {
  const runId = state.currentRun.runId;
  const route = `/api/runs/${encodeURIComponent(runId)}/${type}`;
  await action(`Running ${type}`, async () => {
    const data = await postJson(route, {});
    state.currentRun = data.run;
    if (type === "concepts") state.selectedConcepts.clear();
    renderCurrentRun();
    if (type === "upgrade") {
      return "Finalists upgraded. Open Finalist A and Finalist B below.";
    }
    if (type === "validate") {
      return "Validation complete. Open the validation report below.";
    }
    return `${type} complete`;
  });
}

function renderRuns() {
  els.runsList.innerHTML = "";

  if (state.runs.length === 0) {
    els.runsList.innerHTML = `<p>No runs yet. Start one above.</p>`;
    return;
  }

  for (const run of state.runs) {
    const button = document.createElement("button");
    button.className = `run-item ${state.currentRun?.runId === run.runId ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(run.runId)}</strong><small>${escapeHtml(run.targetUrl || "No target URL")}</small>`;
    button.addEventListener("click", async () => {
      state.currentRun = await getJson(`/api/runs/${encodeURIComponent(run.runId)}`);
      state.selectedConcepts.clear();
      renderRuns();
      renderCurrentRun();
    });
    els.runsList.append(button);
  }
}

function renderCurrentRun() {
  const run = state.currentRun;
  if (!run) {
    els.currentRunTitle.textContent = "No run selected";
    els.conceptGrid.innerHTML = "";
    els.finalistLinks.innerHTML = "";
    updateControlState();
    return;
  }

  els.currentRunTitle.textContent = run.runId;
  els.targetBriefLink.href = run.links.targetBrief;
  renderConcepts(run);
  renderFinalists(run);
  updateControlState();
  writeLog(`Run loaded: ${run.runId}
Target: ${run.targetUrl}
Assets: ${run.assets.downloaded}/${run.assets.total}
Status: ${JSON.stringify(run.status, null, 2)}`);
}

function renderConcepts(run) {
  els.conceptGrid.innerHTML = "";

  if (!run.status.concepts) {
    els.conceptGrid.innerHTML = `<p>Concept files have not been generated yet. Click Generate 5 Concepts when you are ready.</p>`;
    return;
  }

  const links = [run.links.concept01, run.links.concept02, run.links.concept03, run.links.concept04, run.links.concept05];

  links.forEach((link, index) => {
    const conceptId = `concept-${String(index + 1).padStart(2, "0")}`;
    const card = document.createElement("article");
    card.className = `concept-card ${state.selectedConcepts.has(conceptId) ? "selected" : ""}`;
    card.innerHTML = `
      <iframe src="${link}" title="${conceptId} preview"></iframe>
      <footer>
        <label><input type="checkbox" ${state.selectedConcepts.has(conceptId) ? "checked" : ""}> ${conceptId}</label>
        <a href="${link}" target="_blank" rel="noreferrer">Open</a>
      </footer>
    `;
    card.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) {
        if (state.selectedConcepts.size >= 2) {
          event.target.checked = false;
          writeLog("Only two finalists can be selected.");
          return;
        }
        state.selectedConcepts.add(conceptId);
      } else {
        state.selectedConcepts.delete(conceptId);
      }
      renderConcepts(run);
      updateControlState();
    });
    els.conceptGrid.append(card);
  });
}

function renderFinalists(run) {
  const links = [];
  if (run.status.finalists) {
    links.push(`<div class="finalist-ready">Finalists upgraded. Open A and B below.</div>`);
    links.push(`<a href="${run.links.finalistA}" target="_blank" rel="noreferrer">Open Finalist A</a>`);
    links.push(`<a href="${run.links.finalistB}" target="_blank" rel="noreferrer">Open Finalist B</a>`);
  }
  if (run.status.validation) {
    links.push(`<a href="${run.links.validation}" target="_blank" rel="noreferrer">Validation Report</a>`);
  }
  els.finalistLinks.innerHTML = links.length > 0 ? links.join("") : "<p>No finalists upgraded yet.</p>";
}

async function action(label, task) {
  writeLog(`${label}...`);
  showBanner(`${label}...`);
  setBusy(true);
  try {
    const message = await task();
    writeLog(message);
    showBanner(message);
  } catch (error) {
    writeLog(`Error: ${error.message}`);
    showBanner(`Error: ${error.message}`, { error: true });
  } finally {
    setBusy(false);
  }
}

function showBanner(message, { error = false } = {}) {
  els.actionBanner.hidden = false;
  els.actionBanner.textContent = `${message} / ${new Date().toLocaleTimeString()}`;
  els.actionBanner.style.borderColor = error ? "var(--accent)" : "";
  els.actionBanner.style.background = error ? "#ef6b3c24" : "";
}

function setBusy(isBusy) {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });

  if (!isBusy) {
    updateControlState();
  }
}

function updateControlState() {
  const run = state.currentRun;

  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    let enabled = Boolean(run);

    if (action === "assets") enabled = Boolean(run?.status?.targetAnalysis);
    if (action === "concepts") enabled = Boolean(run?.status?.targetAnalysis);
    if (action === "upgrade") enabled = Boolean(run?.status?.selection);
    if (action === "validate") enabled = Boolean(run);

    button.disabled = !enabled;
  });

  els.selectFinalists.disabled = !run?.status?.concepts || state.selectedConcepts.size !== 2;
  els.upgradeFinalistsSecondary.disabled = !run?.status?.selection;
  els.targetBriefLink.style.pointerEvents = run ? "auto" : "none";
  els.targetBriefLink.style.opacity = run ? "1" : ".45";
}

async function getJson(url) {
  const response = await fetch(url);
  return parseResponse(response);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function writeLog(message) {
  els.log.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
