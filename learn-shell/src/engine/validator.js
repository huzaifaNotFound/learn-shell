

import { getNodeAt, cwdToString } from './filesystem.js';


export function checkChallenge(command, newState, level, sequenceStep = 0) {
  if (!level?.challenge?.validate) {
    return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal: null };
  }
  return dispatch(level.challenge.validate, command, newState, sequenceStep);
}

function dispatch(v, command, state, sequenceStep) {
  switch (v.type) {
    case 'none':
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


function checkCommand(v, command, state, sequenceStep) {
  const trimmed = command.trim();
  const candidates = Array.isArray(v.expected) ? v.expected : [v.expected];

  let passed = candidates.some((exp) => trimmed === exp);

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

  if (sequenceStep >= stepsTotal) {
    return { passed: true, stepCompleted: false, nextStep: sequenceStep, stepsTotal };
  }

  const currentStep = steps[sequenceStep];
  const stepResult = dispatch(currentStep, command, state, 0);

  if (stepResult.passed) {
    const nextStep = sequenceStep + 1;
    const allDone = nextStep >= stepsTotal;
    return { passed: allDone, stepCompleted: true, nextStep, stepsTotal };
  }

  return { passed: false, stepCompleted: false, nextStep: sequenceStep, stepsTotal };
}

function absoluteSegments(path) {
  return path.split('/').filter(Boolean);
}
