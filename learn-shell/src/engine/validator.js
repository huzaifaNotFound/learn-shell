// src/engine/validator.js
//
// Pure function — no React, no DOM. Takes the command string, the
// filesystem state AFTER running the command, the active level, and the
// current sequence-step counter. Returns:
//
//   { passed, stepCompleted, nextStep, stepsTotal }
//
//   passed        — true when the whole challenge is done (mark level done)
//   stepCompleted — true when the current step of a sequence just passed
//   nextStep      — updated step counter the caller should store
//   stepsTotal    — only set for sequence challenges; used to render progress

import { getNodeAt, cwdToString } from './filesystem.js';

// ─── Public entry point ────────────────────────────────────────────────────

export function checkChallenge(command, newState, level, sequenceStep = 0) {
  if (!level?.challenge?.validate) {
    return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal: null };
  }
  return dispatch(level.challenge.validate, command, newState, sequenceStep);
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

function dispatch(v, command, state, sequenceStep) {
  switch (v.type) {
    case 'none':
      // Preview / not-yet-implemented levels — never auto-pass.
      return empty(sequenceStep);
    case 'command':
      return checkCommand(v, command, state, sequenceStep);
    case 'cwd':
      return checkCwd(v, state, sequenceStep);
    case 'exists':
      return checkExists(v, state, sequenceStep);
    case 'not-exists':
      return checkNotExists(v, state, sequenceStep);
    case 'sequence':
      return checkSequence(v, command, state, sequenceStep);
    default:
      return empty(sequenceStep);
  }
}

function empty(sequenceStep) {
  return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal: null };
}

// ─── Individual checkers ───────────────────────────────────────────────────

function checkCommand(v, command, state, sequenceStep) {
  const trimmed = command.trim();
  // `expected` can be a single string or an array of acceptable alternatives.
  const candidates = Array.isArray(v.expected) ? v.expected : [v.expected];

  let passed = candidates.some((exp) => trimmed === exp);

  // Optional: also require the learner to be in a specific cwd.
  if (passed && v.cwd) {
    passed = cwdToString(state.cwd) === v.cwd;
  }

  return { passed, stepCompleted: passed, nextStep: sequenceStep, stepsTotal: null };
}

function checkCwd(v, state, sequenceStep) {
  const passed = cwdToString(state.cwd) === v.path;
  return { passed, stepCompleted: passed, nextStep: sequenceStep, stepsTotal: null };
}

function checkExists(v, state, sequenceStep) {
  const segments = absoluteSegments(v.path);
  const node = getNodeAt(state, segments);
  if (!node) return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal: null };
  let passed = true;
  if (v.nodeType === 'dir') passed = node.type === 'dir';
  else if (v.nodeType === 'file') passed = node.type === 'file';
  return { passed, stepCompleted: passed, nextStep: sequenceStep, stepsTotal: null };
}

function checkNotExists(v, state, sequenceStep) {
  const segments = absoluteSegments(v.path);
  const node = getNodeAt(state, segments);
  const passed = !node;
  return { passed, stepCompleted: passed, nextStep: sequenceStep, stepsTotal: null };
}

function checkSequence(v, command, state, sequenceStep) {
  const steps = v.steps;
  const stepsTotal = steps.length;

  // Already finished (shouldn't normally reach here, but guard anyway).
  if (sequenceStep >= stepsTotal) {
    return { passed: true, stepCompleted: false, nextStep: sequenceStep, stepsTotal };
  }

  // Check only the CURRENT step.
  const currentStep = steps[sequenceStep];
  const stepResult = dispatch(currentStep, command, state, 0);

  if (stepResult.passed) {
    const nextStep = sequenceStep + 1;
    const allDone = nextStep >= stepsTotal;
    return { passed: allDone, stepCompleted: true, nextStep, stepsTotal };
  }

  return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal };
}

// ─── Utility ───────────────────────────────────────────────────────────────

// Converts an absolute path string like "/home/user/foo" into segments
// ["home", "user", "foo"] that getNodeAt() expects.
function absoluteSegments(path) {
  return path.split('/').filter(Boolean);
}
