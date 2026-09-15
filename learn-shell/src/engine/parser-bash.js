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

  // Quote-aware tokeniser so `find . -name '*.txt'` doesn't get mangled.
  const args = tokenise(trimmed);
  const [command, ...rest] = args;

  switch (command) {
    case 'pwd':
      return runPwd(state);
    case 'ls':
      return runLs(rest, state);
    case 'cd':
      return runCd(rest, state);
    case 'cat':
      return runCat(rest, state);
    case 'mkdir':
      return runMkdir(rest, state);
    case 'touch':
      return runTouch(rest, state);
    case 'rm':
      return runRm(rest, state);
    case 'cp':
      return runCp(rest, state);
    case 'mv':
      return runMv(rest, state);
    case 'find':
      return runFind(rest, state);
    case 'grep':
      return runGrep(rest, state);
    case 'echo':
      return runEcho(rest, state);
    case 'whoami':
      return runWhoami(state);
    case 'help':
      return runHelp(state);
    case 'clear':
      return { output: '', newState: state, clearScreen: true };
    default:
      return {
        output: `bash: ${command}: command not found`,
        newState: state,
      };
  }
}

// Splits on whitespace while respecting single- and double-quoted tokens.
// 'find . -name "*.txt"' → ['find', '.', '-name', '*.txt']
function tokenise(input) {
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (const ch of input) {
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === ' ' && !inSingle && !inDouble) {
      if (current.length > 0) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
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

function runHelp(state) {
  const cmds = [
    'pwd      — print working directory',
    'ls       — list directory contents  (ls -a for hidden files)',
    'cd       — change directory         (cd .. to go up)',
    'cat      — print file contents',
    'mkdir    — create a directory',
    'touch    — create an empty file',
    'rm       — remove a file            (rm -r for directories)',
    'cp       — copy a file              (cp -r for directories)',
    'mv       — move or rename a file',
    'find     — search for files         (find . -name "*.txt")',
    'grep     — search inside files      (grep pattern file)',
    'echo     — print text',
    'whoami   — print current user',
    'clear    — clear the screen',
  ];
  return { output: cmds.join('\n'), newState: state };
}

// ─── cp ───────────────────────────────────────────────────────────────────

function runCp(args, state) {
  const recursive = args.some((a) => a === '-r' || a === '-R');
  const nonFlags = args.filter((a) => !a.startsWith('-'));

  if (nonFlags.length < 2) {
    return { output: missingOperand('cp', 'missing file operand'), newState: state };
  }

  const [src, dst] = nonFlags;
  const srcSegments = resolvePath(state, src);
  const srcNode = getNodeAt(state, srcSegments);

  if (!srcNode) {
    return { output: `cp: cannot stat '${src}': No such file or directory`, newState: state };
  }
  if (srcNode.type === 'dir' && !recursive) {
    return { output: `cp: -r not specified; omitting directory '${src}'`, newState: state };
  }

  const dstSegments = resolvePath(state, dst);
  const dstNode = getNodeAt(state, dstSegments);

  // If destination is an existing directory, copy the source inside it.
  let finalSegments = dstSegments;
  if (dstNode?.type === 'dir') {
    finalSegments = [...dstSegments, srcSegments.at(-1)];
  }

  const { parentSegments } = splitParent(finalSegments);
  const parentNode = getNodeAt(state, parentSegments);
  if (!parentNode || parentNode.type !== 'dir') {
    return { output: `cp: cannot create '${dst}': No such file or directory`, newState: state };
  }

  return { output: '', newState: setNodeAt(state, finalSegments, deepCloneNode(srcNode)) };
}

function deepCloneNode(node) {
  if (node.type === 'file') return { ...node };
  return {
    type: 'dir',
    children: Object.fromEntries(
      Object.entries(node.children).map(([name, child]) => [name, deepCloneNode(child)])
    ),
  };
}

// ─── mv ───────────────────────────────────────────────────────────────────

function runMv(args, state) {
  const nonFlags = args.filter((a) => !a.startsWith('-'));

  if (nonFlags.length < 2) {
    return { output: missingOperand('mv', 'missing file operand'), newState: state };
  }

  const [src, dst] = nonFlags;
  const srcSegments = resolvePath(state, src);
  const srcNode = getNodeAt(state, srcSegments);

  if (!srcNode) {
    return { output: `mv: cannot stat '${src}': No such file or directory`, newState: state };
  }

  const dstSegments = resolvePath(state, dst);
  const dstNode = getNodeAt(state, dstSegments);

  // If destination is an existing directory, move source INTO it.
  let finalSegments = dstSegments;
  if (dstNode?.type === 'dir') {
    finalSegments = [...dstSegments, srcSegments.at(-1)];
  }

  // Guard: can't move a directory into itself.
  const srcPath = '/' + srcSegments.join('/');
  const dstPath = '/' + finalSegments.join('/');
  if (dstPath === srcPath || dstPath.startsWith(srcPath + '/')) {
    return { output: `mv: cannot move '${src}' to a subdirectory of itself`, newState: state };
  }

  const { parentSegments } = splitParent(finalSegments);
  const parentNode = getNodeAt(state, parentSegments);
  if (!parentNode || parentNode.type !== 'dir') {
    return { output: `mv: cannot move '${src}' to '${dst}': No such file or directory`, newState: state };
  }

  let newState = setNodeAt(state, finalSegments, srcNode);
  newState = removeNodeAt(newState, srcSegments);
  return { output: '', newState };
}

// ─── find ─────────────────────────────────────────────────────────────────

function runFind(args, state) {
  // find [startPath] [-name glob] [-type f|d]
  // Identify named-flag values first so they aren't treated as paths.
  const namedFlagValues = new Set();
  const flagsWithArgs = ['-name', '-type'];
  flagsWithArgs.forEach((flag) => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) namedFlagValues.add(args[idx + 1]);
  });

  const paths = args.filter((a) => !a.startsWith('-') && !namedFlagValues.has(a));
  const startPath = paths[0] ?? '.';

  const nameIdx = args.indexOf('-name');
  const nameGlob = nameIdx !== -1 ? args[nameIdx + 1] : null;
  const typeIdx = args.indexOf('-type');
  const typeFilter = typeIdx !== -1 ? args[typeIdx + 1] : null; // 'f' or 'd'

  const startSegments = resolvePath(state, startPath);
  const startNode = getNodeAt(state, startSegments);

  if (!startNode) {
    return { output: `find: '${startPath}': No such file or directory`, newState: state };
  }

  const results = [];
  const base = startSegments.length ? '/' + startSegments.join('/') : '/';

  function walk(node, currentPath) {
    const name = currentPath.split('/').filter(Boolean).at(-1) ?? '/';

    // Type filter
    const typeOk = !typeFilter || (typeFilter === 'f' && node.type === 'file') || (typeFilter === 'd' && node.type === 'dir');
    // Name glob filter
    const nameOk = !nameGlob || globMatch(name, nameGlob);

    if (typeOk && nameOk) results.push(currentPath || '/');

    if (node.type === 'dir') {
      for (const [childName, childNode] of Object.entries(node.children)) {
        walk(childNode, (currentPath === '/' ? '' : currentPath) + '/' + childName);
      }
    }
  }

  walk(startNode, base);
  return { output: results.join('\n'), newState: state };
}

// Converts a simple glob pattern (* = any chars, ? = one char) to a regex.
function globMatch(name, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(name);
}

// ─── grep ─────────────────────────────────────────────────────────────────

function runGrep(args, state) {
  const recursive = args.some((a) => a === '-r' || a === '-R');
  const nonFlags = args.filter((a) => !a.startsWith('-'));

  if (nonFlags.length === 0) {
    return { output: 'usage: grep pattern [file ...]', newState: state };
  }
  if (nonFlags.length === 1 && !recursive) {
    return { output: missingOperand('grep', 'missing file operand'), newState: state };
  }

  const pattern = nonFlags[0];
  const targets = nonFlags.slice(1);
  const multiFile = targets.length > 1 || recursive;
  const lines = [];

  function searchFile(filePath, fileNode) {
    const fileLines = fileNode.content.split('\n');
    fileLines.forEach((line) => {
      if (line.includes(pattern)) {
        lines.push(multiFile ? `${filePath}: ${line}` : line);
      }
    });
  }

  function searchDir(dirPath, dirNode) {
    for (const [name, child] of Object.entries(dirNode.children)) {
      const childPath = dirPath + '/' + name;
      if (child.type === 'file') searchFile(childPath, child);
      else if (child.type === 'dir') searchDir(childPath, child);
    }
  }

  for (const target of targets) {
    const segments = resolvePath(state, target);
    const node = getNodeAt(state, segments);
    if (!node) {
      lines.push(`grep: ${target}: No such file or directory`);
    } else if (node.type === 'dir') {
      if (recursive) searchDir('/' + segments.join('/'), node);
      else lines.push(`grep: ${target}: Is a directory`);
    } else {
      searchFile(target, node);
    }
  }

  return { output: lines.join('\n'), newState: state };
}

 