import { useSyncExternalStore } from "react";


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

