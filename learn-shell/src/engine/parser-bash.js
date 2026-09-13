// src/engine/parser-bash.js
//
// This is the part that actually understands bash commands. `run()`
// takes a typed-in command string plus the current filesystem state,
// and returns what should be printed, plus the (possibly updated) state.
//
// Nothing in this file knows about React or the DOM — it's plain JS.
// That's exactly why it's easy to test on its own (Stage 3) and reuse
// later for cmd/PowerShell (Stage 12), which just swap this file out.

import {
  resolvePath,
  getNodeAt,
  cwdToString,
  splitParent,
  hasChild,
  setNodeAt,
  removeNodeAt,
} from './filesystem.js';

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
    case 'cat':
      return runCat(args, state);
    case 'mkdir':
      return runMkdir(args, state);
    case 'touch':
      return runTouch(args, state);
    case 'rm':
      return runRm(args, state);
    case 'echo':
      return runEcho(args, state);
    case 'whoami':
      return runWhoami(state);
    case 'clear':
      // Clearing the screen isn't a filesystem change — there's no output
      // and no new state. It's a signal to whatever's rendering the
      // history (the Terminal component) to wipe it. See the note where
      // this is used in the UI for the small hookup that needs.
      return { output: '', newState: state, clearScreen: true };
    default:
      return {
        output: `bash: ${command}: command not found`,
        newState: state,
      };
  }
}

// Small helper: real coreutils commands (cat, mkdir, touch, rm...) tend to
// follow their error with a "Try 'X --help' for more information." line.
// Reusing it here means every command's "you forgot the argument" error
// looks like the real thing instead of a generic message.
function missingOperand(command, detail) {
  return `${command}: ${detail}\nTry '${command} --help' for more information.`;
}

function runPwd(state) {
  return { output: cwdToString(state.cwd), newState: state };
}

function runLs(args, state) {
  // Flags and the (optional) path argument can come in any order, e.g.
  // `ls -a projects` or `ls projects -a` — so pull the path out as
  // "whichever arg doesn't start with a dash" rather than assuming position.
  const showHidden = args.some((a) => a.startsWith('-') && a.includes('a'));
  const target = args.find((a) => !a.startsWith('-'));

  const segments = target ? resolvePath(state, target) : state.cwd;
  const node = getNodeAt(state, segments);

  if (!node) {
    return {
      output: `ls: cannot access '${target}': No such file or directory`,
      newState: state,
    };
  }

  if (node.type !== 'dir') {
    // Real `ls` on a single file just echoes its name back — it doesn't
    // print the file's contents (that's what `cat` is for).
    return { output: target, newState: state };
  }

  let names = Object.keys(node.children);
  if (!showHidden) {
    names = names.filter((name) => !name.startsWith('.'));
  }
  names.sort();

  return { output: names.join('  '), newState: state };
}

function runCd(args, state) {
  if (args.length > 1) {
    return { output: 'bash: cd: too many arguments', newState: state };
  }

  const target = args[0];

  if (!target || target === '~') {
    // Plain "cd" (or "cd ~") with no path goes back to the home directory.
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

function runCat(args, state) {
  if (args.length === 0) {
    return { output: missingOperand('cat', 'missing operand'), newState: state };
  }

  // Real `cat` accepts multiple files, prints one after another, and
  // keeps going (printing an error line in place) even if one of them
  // is missing — it doesn't stop at the first problem.
  const lines = [];
  for (const target of args) {
    const segments = resolvePath(state, target);
    const node = getNodeAt(state, segments);

    if (!node) {
      lines.push(`cat: ${target}: No such file or directory`);
    } else if (node.type === 'dir') {
      lines.push(`cat: ${target}: Is a directory`);
    } else {
      // Strip one trailing newline for display, the same way a terminal
      // doesn't show a blank extra line after a file that ends in "\n".
      lines.push(node.content.replace(/\n$/, ''));
    }
  }

  return { output: lines.join('\n'), newState: state };
}

function runMkdir(args, state) {
  const targets = args.filter((a) => !a.startsWith('-'));
  if (targets.length === 0) {
    return { output: missingOperand('mkdir', 'missing operand'), newState: state };
  }

  let newState = state;
  const errors = [];

  for (const target of targets) {
    const segments = resolvePath(newState, target);
    const { parentSegments, name } = splitParent(segments);
    const parentNode = getNodeAt(newState, parentSegments);

    if (!parentNode || parentNode.type !== 'dir') {
      // Covers both "the parent path doesn't exist at all" and
      // "part of the path is actually a file, not a directory" —
      // real mkdir reports both as the same error.
      errors.push(`mkdir: cannot create directory '${target}': No such file or directory`);
      continue;
    }
    if (hasChild(parentNode, name)) {
      errors.push(`mkdir: cannot create directory '${target}': File exists`);
      continue;
    }

    newState = setNodeAt(newState, segments, { type: 'dir', children: {} });
  }

  return { output: errors.join('\n'), newState };
}

function runTouch(args, state) {
  if (args.length === 0) {
    return { output: missingOperand('touch', 'missing file operand'), newState: state };
  }

  let newState = state;
  const errors = [];

  for (const target of args) {
    const segments = resolvePath(newState, target);
    const { parentSegments, name } = splitParent(segments);
    const parentNode = getNodeAt(newState, parentSegments);

    if (!parentNode || parentNode.type !== 'dir') {
      errors.push(`touch: cannot touch '${target}': No such file or directory`);
      continue;
    }

    if (!hasChild(parentNode, name)) {
      newState = setNodeAt(newState, segments, { type: 'file', content: '' });
    }
    // If it already exists, real touch just updates its modified time —
    // we're not tracking timestamps yet, so there's nothing to do.
  }

  return { output: errors.join('\n'), newState };
}

function runRm(args, state) {
  const recursive = args.some((a) => a.startsWith('-') && a.includes('r'));
  const targets = args.filter((a) => !a.startsWith('-'));

  if (targets.length === 0) {
    return { output: missingOperand('rm', 'missing operand'), newState: state };
  }

  let newState = state;
  const errors = [];

  for (const target of targets) {
    const segments = resolvePath(newState, target);
    const node = getNodeAt(newState, segments);

    if (!node) {
      errors.push(`rm: cannot remove '${target}': No such file or directory`);
      continue;
    }
    if (node.type === 'dir' && !recursive) {
      errors.push(`rm: cannot remove '${target}': Is a directory`);
      continue;
    }

    newState = removeNodeAt(newState, segments);
  }

  return { output: errors.join('\n'), newState };
}

function runEcho(args, state) {
  // No variable expansion or quote handling yet — just prints its
  // arguments back, space-separated, the way `echo` does at its simplest.
  return { output: args.join(' '), newState: state };
}

function runWhoami(state) {
  return { output: 'user', newState: state };
}