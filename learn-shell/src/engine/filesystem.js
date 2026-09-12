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
            },
          },
        },
      },
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