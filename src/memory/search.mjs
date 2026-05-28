const TOKEN_MIN_LENGTH = 2;

export function searchMemory(entries, query, { limit = 10 } = {}) {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  return entries
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, queryTokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function scoreEntry(entry, queryTokens) {
  const title = entry.title.toLowerCase();
  const tags = new Set((entry.tags ?? []).map((tag) => tag.toLowerCase()));
  const summary = entry.summary.toLowerCase();
  const source = `${entry.sourceLabel} ${entry.sourceType}`.toLowerCase();
  const filePath = entry.path.toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (tags.has(token)) score += 12;
    if (title.includes(token)) score += 8;
    if (filePath.includes(token)) score += 5;
    if (summary.includes(token)) score += 3;
    if (source.includes(token)) score += 1;
  }

  return score;
}

function tokenize(input) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= TOKEN_MIN_LENGTH);
}
