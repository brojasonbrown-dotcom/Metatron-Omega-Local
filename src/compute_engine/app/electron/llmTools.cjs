/**
 * METATRON Ω — LLM tool layer (the instrument's hands).
 *
 * A small, LOW-RISK tool registry for the optional external answerer. Every
 * network tool is offline-gated by an honest timeout/error (never a fabricated
 * result), size-capped, and read-only with respect to the brain. Local tools
 * only read the brain's own snapshot — the instrument can never write state
 * except through the existing injectSensor memory path.
 */

"use strict";

/** Tool definitions in the OpenAI function-calling schema. */
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "brain_state",
      description:
        "Read the full live METATRON Ω brain snapshot: coherence, memory (7 systems), depth/importance, project, genome, lexicon, structure root, felt state, and sensory channels.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "brain_recall",
      description:
        "Recall the brain's most salient terms (tf·idf in log φ) and their relation structure (word-order edges + Merkle root).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web via DuckDuckGo Instant Answer (no key). Returns text snippets, size-capped.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "the search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Fetch a web page (the 'claw' — grab and strip to text) and return its content, size-capped and time-limited.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "http(s) URL to fetch" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "wolfram_compute",
      description:
        "Compute a real answer via Wolfram|Alpha (math, symbolic integration/solving, unit conversions, CODATA constants, dates). Returns the short plain-text answer. Prefer this over web_search for anything computational.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "the computational query, e.g. 'integrate sin(x)^4 from 0 to 2' or 'distance from Earth to Mars in km'" } },
        required: ["query"],
      },
    },
  },
];

function toolDefinitions() {
  return TOOL_DEFINITIONS;
}

/** Execute one tool. Returns a plain string (never throws). */
async function executeTool(name, args, brainState) {
  switch (name) {
    case "brain_state": {
      return JSON.stringify(brainState).slice(0, 6000);
    }
    case "brain_recall": {
      const lx = brainState?.lexicon ?? {};
      const rel = brainState?.relations ?? {};
      const top = (lx.top ?? [])
        .slice(0, 8)
        .map((e) => `${e.word}(${typeof e.salience === "number" ? e.salience.toFixed(3) : "—"})`)
        .join(", ");
      return JSON.stringify({
        salientTerms: top || "none yet",
        relationNodes: rel.nodes ?? 0,
        relationEdges: (rel.edges ?? []).length,
        structureRoot: brainState?.relationDigest ?? "none",
      });
    }
    case "web_search": {
      const q = String(args?.query ?? "").trim();
      if (!q) return "error: empty search query";
      return webSearch(q);
    }
    case "fetch_url": {
      const u = String(args?.url ?? "").trim();
      if (!/^https?:\/\//i.test(u)) return "error: only http(s) URLs are allowed";
      return fetchUrl(u);
    }
    case "wolfram_compute": {
      const q = String(args?.query ?? "").trim();
      if (!q) return "error: empty query";
      return wolframCompute(q);
    }
    default:
      return `error: unknown tool "${name}"`;
  }
}

async function webSearch(query) {
  const url =
    "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(query);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return `error: search HTTP ${res.status}`;
    const d = await res.json();
    const bits = [];
    if (d.AbstractText) bits.push(d.AbstractText);
    (d.RelatedTopics ?? []).slice(0, 5).forEach((r) => {
      if (r.Text) bits.push(r.Text);
      else if (Array.isArray(r.Topics)) r.Topics.forEach((t) => t && t.Text && bits.push(t.Text));
    });
    return bits.length ? bits.join("\n").slice(0, 2000) : "no results";
  } catch (err) {
    return `error: ${err && err.name === "AbortError" ? "timeout" : err && err.message ? err.message : err}`;
  }
}

async function fetchUrl(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "metatron-omega/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return `error: fetch HTTP ${res.status}`;
    const text = await res.text();
    const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.slice(0, 4000) || "(empty page)";
  } catch (err) {
    return `error: ${err && err.name === "AbortError" ? "timeout" : err && err.message ? err.message : err}`;
  }
}

/** Wolfram|Alpha App ID — env-overridable, default the project credential. */
const WA_APP_ID = process.env.WOLFRAM_ALPHA_APP_ID || "WX4LH6W5AU";

/** Small deterministic TTL cache for Wolfram|Alpha — identical queries are
 *  memoised (bounded size, bounded age) so retries never hammer the API. */
const WA_CACHE = new Map(); // query → { text, at }
const WA_TTL_MS = 5 * 60 * 1000; // 5 min
const WA_CACHE_MAX = 64;

/** Wolfram|Alpha short-answer endpoint — a real computation, size-capped + timeout. */
async function wolframCompute(query) {
  const key = String(query).toLowerCase().trim();
  const hit = WA_CACHE.get(key);
  if (hit && Date.now() - hit.at < WA_TTL_MS) return hit.text;

  const text = await wolframFetch(key);
  if (!text.startsWith("error")) {
    if (WA_CACHE.size >= WA_CACHE_MAX) {
      let oldestKey = null;
      let oldestAt = Infinity;
      for (const [k, v] of WA_CACHE) {
        if (v.at < oldestAt) { oldestAt = v.at; oldestKey = k; }
      }
      if (oldestKey !== null) WA_CACHE.delete(oldestKey);
    }
    WA_CACHE.set(key, { text, at: Date.now() });
  }
  return text;
}

async function wolframFetch(query) {
  const url =
    "https://api.wolframalpha.com/v1/result?appid=" + WA_APP_ID + "&i=" + encodeURIComponent(query) + "&units=metric";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return `error: Wolfram|Alpha HTTP ${res.status}`;
    const text = await res.text();
    return text.trim().slice(0, 2000) || "no result";
  } catch (err) {
    return `error: ${err && err.name === "AbortError" ? "timeout" : err && err.message ? err.message : err}`;
  }
}

module.exports = { toolDefinitions, executeTool };
