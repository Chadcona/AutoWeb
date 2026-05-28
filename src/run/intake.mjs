import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CTA_WORDS = [
  "book",
  "buy",
  "call",
  "contact",
  "demo",
  "get",
  "join",
  "learn",
  "reserve",
  "schedule",
  "shop",
  "sign",
  "start",
  "try",
  "view"
];

const STYLE_MOOD_WORDS = [
  "animation",
  "award",
  "bold",
  "cinematic",
  "craft",
  "editorial",
  "immersive",
  "interactive",
  "luxury",
  "motion",
  "premium",
  "studio",
  "visual"
];

export async function createRun({ rootDir = process.cwd(), targetUrl, inspirationUrl, name }) {
  const normalizedTargetUrl = normalizeUrl(targetUrl);
  const normalizedInspirationUrl = inspirationUrl ? normalizeUrl(inspirationUrl) : null;
  const runId = createRunId(name ?? new URL(normalizedTargetUrl).hostname);
  const runDir = path.join(rootDir, "runs", runId);

  await mkdir(runDir, { recursive: true });

  const target = await analyzeUrl(normalizedTargetUrl, { role: "target" });
  const targetBrief = renderTargetBrief(target);
  const input = {
    runId,
    createdAt: new Date().toISOString(),
    targetUrl: normalizedTargetUrl,
    inspirationUrl: normalizedInspirationUrl,
    target: target.metadata,
    inspiration: null
  };

  const files = {
    input: path.join(runDir, "input.json"),
    targetAnalysis: path.join(runDir, "target-analysis.json"),
    targetBrief: path.join(runDir, "target-brief.md"),
    inspirationAnalysis: null,
    inspirationBrief: null
  };

  let inspirationError = null;

  if (normalizedInspirationUrl) {
    try {
      const inspiration = await analyzeUrl(normalizedInspirationUrl, { role: "inspiration" });
      input.inspiration = inspiration.metadata;
      files.inspirationAnalysis = path.join(runDir, "inspiration-analysis.json");
      files.inspirationBrief = path.join(runDir, "inspiration-brief.md");
      await writeFile(files.inspirationAnalysis, JSON.stringify(serializeAnalysis(inspiration), null, 2) + "\n", "utf8");
      await writeFile(files.inspirationBrief, renderInspirationBrief(inspiration), "utf8");
    } catch (error) {
      inspirationError = error.message;
      input.inspiration = {
        url: normalizedInspirationUrl,
        error: inspirationError
      };
    }
  }

  await writeFile(files.targetAnalysis, JSON.stringify(serializeAnalysis(target), null, 2) + "\n", "utf8");
  await writeFile(files.targetBrief, targetBrief, "utf8");
  await writeFile(files.input, JSON.stringify(input, null, 2) + "\n", "utf8");

  return {
    runId,
    runDir,
    files,
    inspirationError
  };
}

function serializeAnalysis(analysis) {
  const { html, ...serializable } = analysis;
  return serializable;
}

export async function analyzeUrl(url, { role }) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      "user-agent": "WebBuilderMemoryPipeline/0.1 (+local redesign analysis)"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error(`Expected HTML from ${url}, got ${contentType || "unknown content type"}`);
  }

  const html = await response.text();
  const analysis = analyzeHtml(html, url);

  return {
    role,
    html,
    ...analysis,
    metadata: {
      url,
      fetchedAt: new Date().toISOString(),
      title: analysis.title,
      description: analysis.description,
      counts: {
        headings: analysis.headings.length,
        navigationLinks: analysis.navigationLinks.length,
        ctas: analysis.ctas.length,
        images: analysis.images.length,
        svgAssets: analysis.svgAssets.length,
        stylesheets: analysis.stylesheets.length
      }
    }
  };
}

export function analyzeHtml(html, baseUrl) {
  const title = decodeHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "Untitled page");
  const description = decodeHtml(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
      ?? matchFirst(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i)
      ?? ""
  );
  const headings = extractHeadings(html);
  const links = extractLinks(html, baseUrl);
  const navigationLinks = links.filter((link) => link.context === "nav").slice(0, 30);
  const ctas = extractCtas(html, links);
  const images = extractImages(html, baseUrl);
  const svgAssets = extractSvgAssets(html, baseUrl);
  const stylesheets = extractStylesheets(html, baseUrl);
  const text = decodeHtml(stripTags(html));
  const moodSignals = inferMoodSignals(`${title} ${description} ${text}`);

  return {
    title,
    description,
    headings,
    navigationLinks,
    links: links.slice(0, 60),
    ctas,
    images,
    svgAssets,
    stylesheets,
    moodSignals,
    textSample: text.slice(0, 1200)
  };
}

function renderTargetBrief(analysis) {
  return `# Target Site Brief

## Source

- URL: ${analysis.metadata.url}
- Title: ${analysis.title}
- Description: ${analysis.description || "No meta description found."}

## Page Structure

${renderHeadings(analysis.headings)}

## Navigation

${renderLinkList(analysis.navigationLinks, "No navigation links found.")}

## CTA Candidates

${renderLinkList(analysis.ctas, "No CTA-like links or buttons found.")}

## Asset Candidates

### Images

${renderAssetList(analysis.images, "No image candidates found.")}

### SVG And Brand Marks

${renderAssetList(analysis.svgAssets, "No SVG or icon candidates found.")}

### Stylesheets

${renderAssetList(analysis.stylesheets, "No stylesheet references found.")}

## Redesign Notes

- Preserve the target site's real content, purpose, and recognizable brand assets.
- Treat image, SVG, and logo candidates as material to recycle or upgrade professionally.
- Use this brief as the source of truth for content and asset reuse.

## Text Sample

${analysis.textSample || "No readable body text extracted."}
`;
}

function renderInspirationBrief(analysis) {
  return `# Inspiration Site Brief

## Source

- URL: ${analysis.metadata.url}
- Title: ${analysis.title}
- Description: ${analysis.description || "No meta description found."}

## Directional Signals

${analysis.moodSignals.length > 0
    ? analysis.moodSignals.map((signal) => `- ${signal}`).join("\n")
    : "- No strong style words detected. Use visual review later for mood and pacing."}

## Structure Snapshot

${renderHeadings(analysis.headings)}

## Usage Rule

This inspiration site may guide mood, pacing, interaction ambition, layout energy, typography energy, or polish level. Do not copy its brand, layout, content, or proprietary assets. The target site remains the source of truth.
`;
}

function renderHeadings(headings) {
  if (headings.length === 0) {
    return "No headings found.";
  }

  return headings
    .slice(0, 30)
    .map((heading) => `- H${heading.level}: ${heading.text}`)
    .join("\n");
}

function renderLinkList(links, emptyMessage) {
  if (links.length === 0) {
    return emptyMessage;
  }

  return links
    .slice(0, 30)
    .map((link) => `- ${link.text || "(no text)"}: ${link.href}`)
    .join("\n");
}

function renderAssetList(assets, emptyMessage) {
  if (assets.length === 0) {
    return emptyMessage;
  }

  return assets
    .slice(0, 30)
    .map((asset) => `- ${asset.label}: ${asset.url}`)
    .join("\n");
}

function extractHeadings(html) {
  const headings = [];
  const pattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const text = decodeHtml(stripTags(match[2]));
    if (text) {
      headings.push({ level: Number(match[1]), text });
    }
  }

  return headings;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const navRanges = [...html.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi)].map((match) => [
    match.index,
    match.index + match[0].length
  ]);
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const href = attr(match[1], "href");
    if (!href) continue;

    const text = decodeHtml(stripTags(match[2]));
    links.push({
      text,
      href: resolveUrl(href, baseUrl),
      context: inRanges(match.index, navRanges) ? "nav" : "body"
    });
  }

  return links;
}

function extractCtas(html, links) {
  const ctas = links.filter((link) => CTA_WORDS.some((word) => link.text.toLowerCase().includes(word)));
  const buttonPattern = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
  let match;

  while ((match = buttonPattern.exec(html)) !== null) {
    const text = decodeHtml(stripTags(match[1]));
    if (text && CTA_WORDS.some((word) => text.toLowerCase().includes(word))) {
      ctas.push({ text, href: "(button)", context: "button" });
    }
  }

  return dedupeBy(ctas, (cta) => `${cta.text}|${cta.href}`).slice(0, 30);
}

function extractImages(html, baseUrl) {
  const images = [];
  const pattern = /<img\b([^>]*)>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const src = attr(match[1], "src") ?? attr(match[1], "data-src");
    if (!src) continue;

    const alt = attr(match[1], "alt") ?? "image";
    images.push({
      label: alt || guessAssetLabel(src),
      url: resolveUrl(src, baseUrl)
    });
  }

  return dedupeBy(images, (image) => image.url).slice(0, 40);
}

function extractSvgAssets(html, baseUrl) {
  const assets = [];
  const linkedSvgPattern = /<(?:img|source|use|image|link)\b([^>]*)>/gi;
  let match;

  while ((match = linkedSvgPattern.exec(html)) !== null) {
    const url = attr(match[1], "src") ?? attr(match[1], "href") ?? attr(match[1], "xlink:href");
    if (!url || !url.toLowerCase().includes(".svg")) continue;

    assets.push({
      label: guessAssetLabel(url),
      url: resolveUrl(url, baseUrl)
    });
  }

  const inlineSvgCount = (html.match(/<svg\b/gi) ?? []).length;
  if (inlineSvgCount > 0) {
    assets.push({
      label: `${inlineSvgCount} inline SVG element${inlineSvgCount === 1 ? "" : "s"}`,
      url: "(inline svg)"
    });
  }

  return dedupeBy(assets, (asset) => asset.url).slice(0, 40);
}

function extractStylesheets(html, baseUrl) {
  const stylesheets = [];
  const pattern = /<link\b([^>]*)>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const rel = attr(match[1], "rel") ?? "";
    const href = attr(match[1], "href");
    if (!href || !rel.toLowerCase().includes("stylesheet")) continue;

    stylesheets.push({
      label: guessAssetLabel(href),
      url: resolveUrl(href, baseUrl)
    });
  }

  return dedupeBy(stylesheets, (stylesheet) => stylesheet.url).slice(0, 30);
}

function inferMoodSignals(text) {
  const haystack = text.toLowerCase();
  return STYLE_MOOD_WORDS
    .filter((word) => haystack.includes(word))
    .map((word) => `Detected "${word}" language that may inform directional style.`);
}

function attr(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, "i");
  return source.match(pattern)?.[1] ?? null;
}

function matchFirst(source, pattern) {
  return source.match(pattern)?.[1] ?? null;
}

function stripTags(source) {
  return source
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(source) {
  return source
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveUrl(value, baseUrl) {
  if (value.startsWith("data:") || value.startsWith("#")) {
    return value;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function normalizeUrl(value) {
  if (!value) {
    throw new Error("URL is required.");
  }

  const trimmed = value.trim();
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).toString();
}

function createRunId(name) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = slugify(name || "run");
  return `${stamp}-${slug}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "run";
}

function guessAssetLabel(url) {
  try {
    const parsed = new URL(url, "https://example.invalid");
    return path.basename(parsed.pathname) || "asset";
  } catch {
    return path.basename(url) || "asset";
  }
}

function inRanges(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
