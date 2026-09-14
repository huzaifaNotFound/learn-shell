// src/store/courseStore.js
//
// Holds all lesson content and the learner's current progress.
// Follows the same external-store pattern as modeStore.js so that
// any component can subscribe with useSyncExternalStore — no prop-drilling.
//
// Data flow:
//   JSON files (the "source of truth" for content)
//     → loaded once at module init into `state.units`
//     → annotated at runtime with { done: bool } per level
//
// The `activeLesson` field tracks which lesson is open in the terminal.

import { useSyncExternalStore } from 'react';
import unit1 from '../content/bash/unit-1.json';
import unit2 from '../content/bash/unit-2.json';
import unit3 from '../content/bash/unit-3.json';
import unit4 from '../content/bash/unit-4.json';
import unit5 from '../content/bash/unit-5.json';
import unit6 from '../content/bash/unit-6.json';

// ─── Helpers ───────────────────────────────────────────────────────────────

// Annotates a raw unit (from JSON) with runtime progress fields.
// Every level starts as not-done; Stage 8 will persist this to localStorage.
function hydrateUnit(rawUnit) {
  return {
    ...rawUnit,
    levels: rawUnit.levels.map((level) => ({
      ...level,
      done: false,
    })),
  };
}

// How many levels in a unit are done?
function countDone(unit) {
  return unit.levels.filter((l) => l.done).length;
}

// ─── Initial state ─────────────────────────────────────────────────────────

function buildInitialState() {
  const units = [unit1, unit2, unit3, unit4, unit5, unit6].map(hydrateUnit);
  return {
    units,
    // Start in sandbox mode (null) so the welcome screen and logo
    // are visible immediately when the learner opens the app.
    activeLesson: null,
  };
}

let state = buildInitialState();

// ─── Subscriber registry ───────────────────────────────────────────────────

const listeners = new Set();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// ─── Actions ───────────────────────────────────────────────────────────────

/** Select a lesson — opens it in the terminal banner. */
export function setActiveLesson(unitIndex, levelIndex) {
  if (
    state.activeLesson?.unitIndex === unitIndex &&
    state.activeLesson?.levelIndex === levelIndex
  ) {
    return; // already selected, nothing to do
  }
  state = { ...state, activeLesson: { unitIndex, levelIndex } };
  notify();
}

/** Mark a lesson as completed (called by Stage 7 validation logic). */
export function markLessonDone(unitIndex, levelIndex) {
  const units = state.units.map((unit, ui) => {
    if (ui !== unitIndex) return unit;
    return {
      ...unit,
      levels: unit.levels.map((level, li) => {
        if (li !== levelIndex) return level;
        return { ...level, done: true };
      }),
    };
  });

  let nextActive = state.activeLesson;
  // Auto-advance if the lesson we just finished is the currently active one
  if (state.activeLesson?.unitIndex === unitIndex && state.activeLesson?.levelIndex === levelIndex) {
    const currentUnit = units[unitIndex];
    if (levelIndex < currentUnit.levels.length - 1) {
      nextActive = { unitIndex, levelIndex: levelIndex + 1 };
    } else if (unitIndex < units.length - 1) {
      // Move to the first lesson of the next unit
      nextActive = { unitIndex: unitIndex + 1, levelIndex: 0 };
    }
  }

  state = { ...state, units, activeLesson: nextActive };
  notify();
}

/** Dismiss the active lesson (back to sandbox mode). */
export function clearActiveLesson() {
  state = { ...state, activeLesson: null };
  notify();
}

// ─── Derived selectors (pure functions, no subscription needed) ────────────

/** Returns the active level object, or null if none is selected. */
export function getActiveLevel(courseState) {
  const { activeLesson, units } = courseState;
  if (!activeLesson) return null;
  const unit = units[activeLesson.unitIndex];
  if (!unit) return null;
  return unit.levels[activeLesson.levelIndex] ?? null;
}

/**
 * Builds the shape that Sidebar expects — mirrors what the old hardcoded
 * `sections` array looked like, so the rendering code needs minimal changes.
 *
 * Returns: [{ number, title, completed, total, locked, levels: [{ id, title, done, locked, active }] }]
 */
export function buildSections(courseState) {
  const { units, activeLesson } = courseState;

  return units.map((unit, unitIndex) => {
    const completed = countDone(unit);
    const total = unit.levels.length;

    return {
      number: unit.unitNumber,
      title: unit.title,
      completed,
      total,
      locked: false, // Lock feature removed — all units are always accessible
      levels: unit.levels.map((level, levelIndex) => ({
        id: level.id,
        title: level.title,
        done: level.done,
        locked: false, // Lock feature removed — all levels are always accessible
        isCheckpoint: level.isCheckpoint ?? false,
        active:
          activeLesson?.unitIndex === unitIndex &&
          activeLesson?.levelIndex === levelIndex,
        // Raw indices, needed when the sidebar calls setActiveLesson
        unitIndex,
        levelIndex,
      })),
    };
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/** Subscribe a React component to the full course state. */
export function useCourseState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
