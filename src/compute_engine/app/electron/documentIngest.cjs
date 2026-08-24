/**
 * AVA — document ingest. A dropped file is read HERE, in the trusted main
 * process — never in the sandboxed renderer (which only ever sends a path).
 *
 * Validity rules (the "stable structure" half of the brief):
 *   - size-capped (a dropped blob can't OOM the process);
 *   - type is SNIFFED from magic bytes, never trusted from the extension
 *     (a ".txt" that is really a PDF is read as a PDF);
 *   - PDFs get their text layer extracted (built-in, no new dependency);
 *   - everything else is decoded as UTF-8 text ONLY if it actually looks like
 *     text (control-byte heuristic) — a binary is refused honestly;
 *   - the result is normalised text + a digest, ready to route to the engine /
 *     mind like any other message.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

// A dropped document is capped at 8 MB on disk — far past any real note/spec,
// small enough that readFile can't stall the main process.
const MAX_BYTES = 8 * 1024 * 1024;
// The text we keep for the engine is capped too (the responder slices to 4000
// anyway; we keep a generous window so the mind's grounded path has context).
const MAX_TEXT = 12000;

/** Sniff the real content type from magic bytes; fall back to "text". */
function sniffType(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  // IMAGE magics — these are SIGHT carrying possible words, routed to OCR.
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image"; // PNG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image"; // JPEG
  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "GIF8") return "image"; // GIF
  if (buf.length >= 2 && buf.subarray(0, 2).toString("latin1") === "BM") return "image"; // BMP
  if (buf.length >= 4 && ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d))) return "image"; // TIFF (II/MM)
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image"; // WEBP
  // Other binary magics we should NOT try to read as text NOR as an image.
  const bin = [
    [0x50, 0x4b, 0x03, 0x04], // ZIP / docx / xlsx
    [0x1f, 0x8b],             // gzip
    [0x25, 0x21, 0x50, 0x53], // PostScript
  ];
  for (const magic of bin) {
    if (buf.length >= magic.length && magic.every((b, i) => buf[i] === b)) return "binary";
  }
  return "text";
}

/** True if a buffer decodes to mostly-printable text (rejects binaries honestly). */
function looksLikeText(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  let bad = 0;
  for (const b of sample) {
    // allow tab/newline/carriage-return and printable + high (UTF-8) bytes
    if (b === 9 || b === 10 || b === 13) continue;
    if (b < 32) bad++; // other control bytes are the binary signature
  }
  return bad / sample.length < 0.01;
}

/**
 * Extract the text layer of a PDF without any new dependency. This pulls the
 * literal strings out of content streams' Tj/TJ operators. It is deliberately
 * honest: a scanned (image-only) PDF yields little or nothing and we say so.
 */
function pdfText(buf) {
  const src = buf.toString("latin1");
  const out = [];
  // ( ... ) Tj   and   [ (..) -250 (..) ] TJ
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:[^\]])*)\]\s*TJ/g;
  let m;
  while ((m = re.exec(src)) !== null && out.join("").length < MAX_TEXT) {
    if (m[1] !== undefined) {
      out.push(unescapePdf(m[1]));
    } else if (m[2] !== undefined) {
      const inner = m[2];
      const strs = [...inner.matchAll(/\(((?:\\.|[^\\()])*)\)/g)].map((x) => unescapePdf(x[1]));
      out.push(strs.join(""));
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function unescapePdf(s) {
  return s
    .replace(/\\([nrtbf()\\])/g, (_a, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[c] ?? c))
    .replace(/\\(\d{1,3})/g, (_a, o) => String.fromCharCode(parseInt(o, 8)));
}

/**
 * Copy an image into the mind's OCR inbox so the OcrFeedSensor reads it and
 * the mind LEARNS its words through the language path. Returns the inbox path
 * on success, null on failure (best-effort — never throws to the renderer).
 */
function routeToOcrInbox(resolved, brainDir) {
  try {
    if (!brainDir) return null;
    const inbox = path.join(brainDir, "mind_inbox", "ocr");
    fs.mkdirSync(inbox, { recursive: true });
    const dest = path.join(inbox, `${Date.now()}-${path.basename(resolved)}`);
    fs.copyFileSync(resolved, dest);
    return dest;
  } catch {
    return null;
  }
}

/**
 * Ingest a dropped file by path. Returns a plain, IPC-safe verdict object —
 * never throws to the renderer; a failure is { ok:false, error }.
 * `opts.brainDir` lets the caller route images into the mind's OCR inbox.
 */
function ingestDocument(filePath, opts = {}) {
  try {
    if (typeof filePath !== "string" || filePath.trim() === "") {
      return { ok: false, error: "no path" };
    }
    const resolved = path.resolve(filePath);
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) return { ok: false, error: "not a file" };
    if (stat.size === 0) return { ok: false, error: "empty file" };
    if (stat.size > MAX_BYTES) {
      return { ok: false, error: `too large (${(stat.size / 1e6).toFixed(1)} MB > ${MAX_BYTES / 1e6} MB cap)` };
    }

    const buf = fs.readFileSync(resolved);
    const kind = sniffType(buf);
    const name = path.basename(resolved);
    let text;
    if (kind === "pdf") {
      text = pdfText(buf);
      if (!text) {
        // A scanned (image-only) PDF has no text layer. Honest route: hand it to
        // the OCR sense rather than refusing — the mind can still READ it.
        const dest = routeToOcrInbox(resolved, opts.brainDir);
        if (dest) {
          return { ok: true, name, kind: "scanned-pdf", bytes: stat.size, ocr: true,
            answer: `"${name}" is a scanned PDF (no text layer) — sent to the OCR sense; the mind is reading it now and will learn its words.` };
        }
        return { ok: false, error: "PDF has no extractable text layer (likely a scanned image) and the OCR inbox is unavailable" };
      }
    } else if (kind === "image") {
      // UNLIMITED OCR: an image is sight carrying words. Route it to the OCR
      // sense — the mind reads it and learns its language. Not a refusal.
      const dest = routeToOcrInbox(resolved, opts.brainDir);
      if (dest) {
        return { ok: true, name, kind: "image", bytes: stat.size, ocr: true,
          answer: `"${name}" is an image — sent to the OCR sense; the mind is reading its text and learning from it now.` };
      }
      return { ok: false, error: "image file, but the OCR inbox is unavailable (mind not running?)" };
    } else if (kind === "binary") {
      return { ok: false, error: "binary file — only text-bearing documents and images (via OCR) are read" };
    } else {
      if (!looksLikeText(buf)) {
        return { ok: false, error: "not a text document (control-byte scan failed)" };
      }
      text = buf.toString("utf8").replace(/﻿/g, "").trim();
    }

    if (!text) return { ok: false, error: "no readable text" };
    const truncated = text.length > MAX_TEXT;
    const body = truncated ? text.slice(0, MAX_TEXT) : text;
    return {
      ok: true,
      name,
      kind,
      bytes: stat.size,
      chars: text.length,
      truncated,
      text: body,
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

module.exports = { ingestDocument, MAX_BYTES, MAX_TEXT };
