import { useSyncExternalStore } from "react";

// Shared modal-navigation state for the whole app.
//
//   "terminal" — the default: typing goes into the terminal, caret blinks.
//   "navigate" — Esc was pressed: arrow keys move focus around the sidebar,
//                Enter opens a section or selects a lesson, terminal input
//                is disabled and the caret is hidden.
//
// Kept as a tiny external store (not React state) so Terminal.jsx and
// Sidebar.jsx can both read and flip it without a shared parent component
// or prop-drilling. Esc is the only thing that toggles it, and that
// listener lives in Terminal.jsx.

let mode = "terminal";
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return mode;
}

export function useMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setMode(next) {
  if (mode === next) return;
  mode = next;
  notify();
}

export function toggleMode() {
  setMode(mode === "terminal" ? "navigate" : "terminal");
}