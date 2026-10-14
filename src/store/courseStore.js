

import { useSyncExternalStore } from 'react';
import unit1 from '../content/bash/unit-1.json';
import unit2 from '../content/bash/unit-2.json';
import unit3 from '../content/bash/unit-3.json';
import unit4 from '../content/bash/unit-4.json';
import unit5 from '../content/bash/unit-5.json';
import unit6 from '../content/bash/unit-6.json';

const STORAGE_KEY = "learn_shell_progress";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(units) {
  const progress = {};
  units.forEach(u => {
    u.levels.forEach(l => {
      if (l.done) progress[l.id] = true;
    });
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function hydrateUnit(rawUnit, progress) {
  return {
    ...rawUnit,
    levels: rawUnit.levels.map((level) => ({
      ...level,
      done: progress[level.id] === true,
    })),
  };
}

function countDone(unit) {
  return unit.levels.filter((l) => l.done).length;
}

function buildInitialState() {
  const progress = loadProgress();
  const units = [unit1, unit2, unit3, unit4, unit5, unit6].map(u => hydrateUnit(u, progress));
  return {
    units,
    activeLesson: null,
  };
}

let state = buildInitialState();

window.__completeAll = function() {
  const units = state.units.map(unit => ({
    ...unit,
    levels: unit.levels.map(level => ({ ...level, done: true }))
  }));
  state = { ...state, units, activeLesson: null };
  saveProgress(units);
  notify();
};

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  state = buildInitialState();
  notify();
}


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

export function setActiveLesson(unitIndex, levelIndex) {
  if (
    state.activeLesson?.unitIndex === unitIndex &&
    state.activeLesson?.levelIndex === levelIndex
  ) {
    return; 
  }
  state = { ...state, activeLesson: { unitIndex, levelIndex } };
  notify();
}

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
  if (state.activeLesson?.unitIndex === unitIndex && state.activeLesson?.levelIndex === levelIndex) {
    const currentUnit = units[unitIndex];
    if (levelIndex < currentUnit.levels.length - 1) {
      nextActive = { unitIndex, levelIndex: levelIndex + 1 };
    } else if (unitIndex < units.length - 1) {
      nextActive = { unitIndex: unitIndex + 1, levelIndex: 0 };
    }
  }

  state = { ...state, units, activeLesson: nextActive };
  saveProgress(units);
  notify();
}

export function clearActiveLesson() {
  state = { ...state, activeLesson: null };
  notify();
}

export function getActiveLevel(courseState) {
  const { activeLesson, units } = courseState;
  if (!activeLesson) return null;
  const unit = units[activeLesson.unitIndex];
  if (!unit) return null;
  return unit.levels[activeLesson.levelIndex] ?? null;
}

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
      locked: false, 
      levels: unit.levels.map((level, levelIndex) => ({
        id: level.id,
        title: level.title,
        done: level.done,
        locked: false, 
        isCheckpoint: level.isCheckpoint ?? false,
        active:
          activeLesson?.unitIndex === unitIndex &&
          activeLesson?.levelIndex === levelIndex,
       
        unitIndex,
        levelIndex,
      })),
    };
  });
}

export function useCourseState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
