/**
 * METATRON Ω — LLM instrument: the OPTIONAL external answerer.
 *
 * Providers (both OpenAI-compatible, one shared code path):
 *   • openrouter — https://openrouter.ai/api/v1/chat/completions
 *     a universal key that serves DeepSeek AND general models
 *     (deepseek/deepseek-chat, deepseek/deepseek-r1, and thousands more).
 *   • deepseek   — https://api.deepseek.com/v1/chat/completions
 *     DeepSeek's native API (deepseek-chat / deepseek-reasoner).
 *
 * What it honestly is: when (and only when) the operator toggles it on in the
 * Σ panel, chat messages are answered by the selected provider — brain-in-the-
 * loop. The brain hears the question first (encoded + stepped before the call),
 * the model answers with the brain's LIVE state digest in its system context
 * (rungs, coherence, memory, cognition — see brainContext in main.cjs), and the
 * answer is fed back into the field as memory. The renderer styles those
 * bubbles differently (msg.omega.llm) so an external answer can never be
 * mistaken for a live brain computation. The Ω brain stays the default
 * instrument; this module never answers on its own.
 *
 * Keys: OPENROUTER_API_KEY and DEEPSEEK_API_KEY, plus METATRON_LLM_PROVIDER /
 * METATRON_LLM_MODEL (which provider + model to use). Setting a key from the UI
 * writes the session env immediately and persists via setx (HKCU) for future
 * launches — plaintext, personal-use. Nothing is ever written into the .bat
 * launchers.
 *
 * No history is kept: each ask is a single honest round-trip.
 */
"use strict";

const { spawn } = require("node:child_process");

const PROVIDERS = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "deepseek/deepseek-chat",
    keyVar: "OPENROUTER_API_KEY",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-chat",
    keyVar: "DEEPSEEK_API_KEY",
  },
};

const PROVIDER_VAR = "METATRON_LLM_PROVIDER";
const MODEL_VAR = "METATRON_LLM_MODEL";
const TIMEOUT_MS = 30000;

let active = false;

function provider() {
  return process.env[PROVIDER_VAR] === "deepseek" ? "deepseek" : "openrouter";
}

function model() {
  const m = (process.env[MODEL_VAR] || "").trim();
  return m || PROVIDERS[provider()].defaultModel;
}

function hasKey() {
  return !!(process.env[PROVIDERS[provider()].keyVar] || "").trim();
}

/** { hasKey, active, provider, model } — the panel's instrument row reads this. */
function status() {
  return { hasKey: hasKey(), active, provider: provider(), model: model() };
}

/** Toggle the instrument. Refuses to activate without a key — honestly. */
function setActive(on) {
  if (on && !hasKey()) {
    return { ok: false, error: `no ${PROVIDERS[provider()].keyVar} set — paste one in the Σ panel first` };
  }
  active = !!on;
  return { ok: true, active };
}

/** Persist a value: session env now, setx (HKCU) for future launches. */
function persist(varName, value) {
  process.env[varName] = value;
  try {
    spawn("setx", [varName, value], { windowsHide: true }).on("error", () => {
      /* setx unavailable — the session env still carries it */
    });
  } catch {
    /* non-fatal */
  }
}

/** Set + persist the key for the CURRENT provider. */
function setKey(key) {
  const k = String(key ?? "").trim();
  if (!k) return { ok: false, error: "empty key" };
  persist(PROVIDERS[provider()].keyVar, k);
  return { ok: true, hasKey: true, provider: provider() };
}

/** Switch provider; the model resets to that provider's sensible default. */
function setProvider(p) {
  if (p !== "openrouter" && p !== "deepseek") {
    return { ok: false, error: "provider must be openrouter or deepseek" };
  }
  persist(PROVIDER_VAR, p);
  persist(MODEL_VAR, PROVIDERS[p].defaultModel);
  process.env[PROVIDER_VAR] = p;
  process.env[MODEL_VAR] = PROVIDERS[p].defaultModel;
  return { ok: true, provider: p, model: model() };
}

/** Set + persist the model within the current provider. */
function setModel(m) {
  const v = String(m ?? "").trim();
  if (!v) return { ok: false, error: "empty model" };
  persist(MODEL_VAR, v);
  return { ok: true, model: v };
}

/** One honest round-trip to the selected provider's OpenAI-compatible API.
 * Never throws — returns { ok, ... }. `brainContext`, when given, is the Ω
 * brain's live state digest — the instrument answers WITH knowledge of the
 * field, not in a vacuum. `opts.tools` (OpenAI function schema) enables
 * tool-calling; `opts.extraMessages` appends prior tool results for the loop. */
async function ask(text, brainContext, opts = {}) {
  const cfg = PROVIDERS[provider()];
  if (!hasKey()) {
    return { ok: false, error: `no ${cfg.keyVar} — paste one in the Σ panel` };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const body = {
      model: model(),
      messages: [
        {
          role: "system",
          content:
            "You are the external instrument coupled to the METATRON Ω toroidal brain — a deterministic 18-rung toroidal RHUFT engine whose constants derive from φ: memory kernel λ=φ⁻²≈0.381966 (present/past balance point; characteristic roots exactly {1, −φ⁻²}), vacuum drive setpoint φ⁻¹≈0.618034, closure coupling κ=1/(φπ)≈0.196726, Jury contraction gain 0.750776. Answer concisely and honestly; say when you don't know. When you need live or external information, call one of the available tools and base your answer on the tool result." +
            (brainContext ? `\n\n${String(brainContext).slice(0, 4000)}` : ""),
        },
        { role: "user", content: String(text).slice(0, 8000) },
        ...(opts.extraMessages ?? []),
      ],
      temperature: 0.3,
    };
    if (opts.tools && opts.tools.length) {
      body.tools = opts.tools;
      body.tool_choice = "auto";
    }

    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${String(process.env[cfg.keyVar]).trim()}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = (await res.text()).slice(0, 200);
      return { ok: false, error: `llm API ${res.status}: ${errBody}` };
    }
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const answer = (msg?.content ?? "").trim();
    const toolCalls = msg?.tool_calls ?? [];
    if (!answer && toolCalls.length === 0) return { ok: false, error: "llm returned an empty answer" };
    return { ok: true, answer, toolCalls };
  } catch (err) {
    const msg =
      err && err.name === "AbortError"
        ? `timed out after ${TIMEOUT_MS / 1000}s`
        : String(err && err.message ? err.message : err);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { ask, setKey, setActive, setProvider, setModel, status };
