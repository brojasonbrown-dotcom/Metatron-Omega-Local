/**
 * AVA chat renderer — the classic, proven chat loop:
 * append user bubble → typing indicator → IPC to main (real engine compute)
 * → replace with answer. Vanilla DOM, no framework, nothing else needed.
 */
"use strict";

const log = document.getElementById("log");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function addBubble(text, kind) {
  const div = document.createElement("div");
  div.className = `msg ${kind}`;
  div.textContent = text;
  log.appendChild(div);
  scrollIfPinned();
  return div;
}

// Auto-scroll ONLY when the user is already at (or near) the bottom. If they've
// scrolled up to read an earlier reply, a new message must NOT yank them down.
function isPinnedToBottom() {
  const threshold = 80; // px of slack that still counts as "at the bottom"
  return log.scrollHeight - log.scrollTop - log.clientHeight <= threshold;
}

function scrollIfPinned() {
  if (isPinnedToBottom()) log.scrollTop = log.scrollHeight;
}

function autoresize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autoresize();

  addBubble(text, "user");
  const typing = addBubble("computing", "ava typing");
  sendBtn.disabled = true;

  try {
    const r = await window.omega.send(text);
    typing.classList.remove("typing");
    if (r.ok) {
      typing.textContent = r.answer;
    } else {
      typing.textContent = `engine error: ${r.error}`;
      typing.classList.add("error");
    }
  } catch (err) {
    typing.classList.remove("typing");
    typing.textContent = `ipc error: ${err}`;
    typing.classList.add("error");
  } finally {
    sendBtn.disabled = false;
    input.focus();
    scrollIfPinned();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  void send();
});
input.addEventListener("input", autoresize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void send();
  }
});

/* document drag-and-drop: a file dropped anywhere on the window is read by the
 * MAIN process (the sandboxed renderer never touches its bytes — it passes only
 * the path). The extracted text is routed like a chat message and lands here. */
const dropOverlay = document.getElementById("drop");
let dragDepth = 0; // dragenter/dragleave pair counting so child elements don't flicker

function showDrop(on) {
  dropOverlay.classList.toggle("on", on);
}

window.addEventListener("dragenter", (e) => {
  if (![...(e.dataTransfer?.types || [])].includes("Files")) return;
  e.preventDefault();
  dragDepth++;
  showDrop(true);
});
window.addEventListener("dragover", (e) => e.preventDefault()); // required so drop fires
window.addEventListener("dragleave", (e) => {
  e.preventDefault();
  if (--dragDepth <= 0) { dragDepth = 0; showDrop(false); }
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  showDrop(false);
  const files = [...(e.dataTransfer?.files || [])];
  for (const f of files) void ingestFile(f);
});

async function ingestFile(file) {
  // The dropped File carries an absolute path in the packaged app; main reads it.
  const p = file.path;
  if (!p) {
    addBubble(`can't read "${file.name}" — no filesystem path (drag a real file, not a browser blob).`, "ava error");
    return;
  }
  addBubble(`📄 ${file.name}`, "user");
  const typing = addBubble("reading document", "ava typing");
  try {
    const r = await window.omega.ingestDocument(p);
    typing.classList.remove("typing");
    if (r.ok) {
      typing.textContent = r.answer;
    } else {
      typing.textContent = `couldn't ingest "${file.name}": ${r.error}`;
      typing.classList.add("error");
    }
  } catch (err) {
    typing.classList.remove("typing");
    typing.textContent = `ipc error: ${err}`;
    typing.classList.add("error");
  } finally {
    scrollIfPinned();
  }
}

addBubble(
  "METATRON Ω online · toroidal brain linked.\nEvery reply is computed live from the field. Type `help` for the command set.",
  "ava",
);
