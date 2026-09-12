// src/engine/parser-bash.js
//
// This is the part that actually understands bash commands. `run()`
// takes a typed-in command string plus the current filesystem state,
// and returns what should be printed, plus the (possibly updated) state.
//
// Nothing in this file knows about React or the DOM — it's plain JS.
// That's exactly why it's easy to test on its own (Stage 3) and reuse
// later for cmd/PowerShell (Stage 12), which just swap this file out.

import { resolvePath, getNodeAt, cwdToString } from './filesystem.js';

export function run(input, state) {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { output: '', newState: state };
  }

  const [command, ...args] = trimmed.split(/\s+/);

  switch (command) {
    case 'pwd':
      return runPwd(state);
    case 'ls':
      return runLs(args, state);
    case 'cd':
      return runCd(args, state);
    default:
      return {
        output: `bash: ${command}: command not found`,
        newState: state,
      };
  }
}

function runPwd(state) {
  return { output: cwdToString(state.cwd), newState: state };
}

function runLs(args, state) {
  // Keep it simple for now — always list the current directory.
  // Flags like `-la` are a good stretch goal once this works.
  const node = getNodeAt(state, state.cwd);

  if (!node || node.type !== 'dir') {
    return { output: 'ls: not a directory', newState: state };
  }

  const names = Object.keys(node.children);
  return { output: names.join('  '), newState: state };
}

function runCd(args, state) {
  const target = args[0];

  if (!target) {
    // Plain "cd" with no argument goes back to the home directory.
    return { output: '', newState: { ...state, cwd: ['home', 'user'] } };
  }

  const newSegments = resolvePath(state, target);
  const node = getNodeAt(state, newSegments);

  if (!node) {
    return {
      output: `bash: cd: ${target}: No such file or directory`,
      newState: state,
    };
  }
  if (node.type !== 'dir') {
    return { output: `bash: cd: ${target}: Not a directory`, newState: state };
  }

  return { output: '', newState: { ...state, cwd: newSegments } };
}