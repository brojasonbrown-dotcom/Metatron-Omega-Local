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
  log.scrollTop = log.scrollHeight;
  return div;
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
    const r = await window.ava.send(text);
    typing.classList.remove("typing");
    if (r.ok) {
      if (r.via === "mind+engine") {
        typing.classList.add("mind-answer");
        typing.textContent =
          r.answer + (Array.isArray(r.grounded) && r.grounded.length ? `\n\n[grounded: ${r.grounded.join(", ")}]` : "");
      } else {
        typing.textContent = r.answer;
      }
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
    log.scrollTop = log.scrollHeight;
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

addBubble(
  "AVA online · terminal linked to the RHUFT engine.\nEvery reply below is computed live. Type `help` for the command set.",
  "ava",
);
