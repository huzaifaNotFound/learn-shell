// src/engine/filesystem.js
//
// This describes a fake, in-memory filesystem — just a plain JS object
// tree. There's no real disk involved; it's data we read and change,
// the same way a real shell reads and changes real files on disk.
//
// A "file" node looks like:      { type: 'file', content: '...' }
// A "directory" node looks like: { type: 'dir', children: { name: node, ... } }

export function createFilesystem() {
  const root = {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          user: {
            type: 'dir',
            children: {
              projects: { type: 'dir', children: {} },
              Documents: { type: 'dir', children: {} },
              Downloads: { type: 'dir', children: {} },
              Desktop: { type: 'dir', children: {} },
              // Dotfiles are real files, but `ls` hides them unless you
              // pass `-a` — same as on a real system. Good for teaching
              // that lesson later.
              '.bashrc': { type: 'file', content: '# ~/.bashrc\n' },
              'notes.txt': {
                type: 'file',
                content: 'Remember to practice cd, ls, and pwd!\n',
              },
            },
          },
        },
      },
      etc: {
        type: 'dir',
        children: {
          hostname: { type: 'file', content: 'shellpath\n' },
          hosts: { type: 'file', content: '127.0.0.1 localhost\n' },
        },
      },
      tmp: { type: 'dir', children: {} },
      var: {
        type: 'dir',
        children: {
          log: {
            type: 'dir',
            children: {
              'system.log': { type: 'file', content: 'boot ok\n' },
              'error.log': { type: 'file', content: '' },
            },
          },
        },
      },
    },
  };

  return {
    root,
    // cwd ("current working directory") is stored as an array of path
    // segments — e.g. ['home', 'user'] means "/home/user".
    // An empty array means "/" (the root itself).
    cwd: ['home', 'user'],
  };
}

// Turns a cwd array back into a display string.
// ['home', 'user'] -> "/home/user"      []  -> "/"
export function cwdToString(cwd) {
  if (cwd.length === 0) return '/';
  return '/' + cwd.join('/');
}

// Walks the tree from root, following an array of path segments.
// Returns the node found there, or null if that path doesn't exist.
function walk(root, segments) {
  let node = root;
  for (const segment of segments) {
    if (node.type !== 'dir' || !node.children[segment]) {
      return null;
    }
    node = node.children[segment];
  }
  return node;
}

export function getNodeAt(state, segments) {
  return walk(state.root, segments);
}

// Turns a typed path — absolute ("/var/log"), relative ("log"), or
// containing ".."/"." — into a resolved array of segments, based on
// where we currently are (state.cwd).
export function resolvePath(state, inputPath) {
  let segments = inputPath.startsWith('/')
    ? [] // absolute path: start fresh from root
    : [...state.cwd]; // relative path: start from where we are now

  const parts = inputPath.split('/').filter((p) => p.length > 0);

  for (const part of parts) {
    if (part === '.') continue; // "." means "stay here" — skip it
    if (part === '..') {
      segments.pop(); // ".." means "go up one level"
    } else {
      segments.push(part);
    }
  }

  return segments;
}

// Splits a resolved segments array into "everything but the last piece"
// (the parent directory) and "the last piece" (the new/target name).
// e.g. ['home','user','notes.txt'] -> { parentSegments: ['home','user'], name: 'notes.txt' }
// Commands like mkdir/touch/rm need this: they have to find the *parent*
// directory first, then add or remove one child inside it.
export function splitParent(segments) {
  const name = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  return { parentSegments, name };
}

// True if `dirNode` already has a child with this name.
export function hasChild(dirNode, name) {
  return dirNode.type === 'dir' && Object.prototype.hasOwnProperty.call(dirNode.children, name);
}

// --- Immutable tree updates ---
//
// React state should never be mutated directly, so instead of reaching
// into the tree and changing a node in place, these two helpers rebuild
// just the path from the root down to the changed node, reusing
// (not copying) every sibling branch that didn't change. That's what
// makes `{ ...state, root: ... }` a safe, genuinely new piece of state.

function setNodeAtPath(node, segments, newNode) {
  if (segments.length === 0) {
    return newNode;
  }
  const [head, ...rest] = segments;
  return {
    ...node,
    children: {
      ...node.children,
      [head]: setNodeAtPath(node.children[head], rest, newNode),
    },
  };
}

// Returns a new state with the node at `segments` created or replaced
// by `newNode`. Used by mkdir and touch.
export function setNodeAt(state, segments, newNode) {
  return { ...state, root: setNodeAtPath(state.root, segments, newNode) };
}

function removeNodeAtPath(node, segments) {
  if (segments.length === 1) {
    const { [segments[0]]: _removed, ...remainingChildren } = node.children;
    return { ...node, children: remainingChildren };
  }
  const [head, ...rest] = segments;
  return {
    ...node,
    children: {
      ...node.children,
      [head]: removeNodeAtPath(node.children[head], rest),
    },
  };
}

// Returns a new state with the node at `segments` deleted entirely
// (deleting a directory deletes everything inside it too, same as `rm -r`).
// Used by rm.
export function removeNodeAt(state, segments) {
  return { ...state, root: removeNodeAtPath(state.root, segments) };
}
