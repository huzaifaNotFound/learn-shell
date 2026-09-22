

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
    cwd: ['home', 'user'],
  };
}

export function cwdToString(cwd) {
  if (cwd.length === 0) return '/';
  return '/' + cwd.join('/');
}

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

export function resolvePath(state, inputPath) {
  let segments = inputPath.startsWith('/')
    ? [] 
    : [...state.cwd]; 

  const parts = inputPath.split('/').filter((p) => p.length > 0);

  for (const part of parts) {
    if (part === '.') continue; 
    if (part === '..') {
      segments.pop(); 
      segments.push(part);
    }
  }

  return segments;
}

export function splitParent(segments) {
  const name = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  return { parentSegments, name };
}

export function hasChild(dirNode, name) {
  return dirNode.type === 'dir' && Object.prototype.hasOwnProperty.call(dirNode.children, name);
}


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

export function removeNodeAt(state, segments) {
  return { ...state, root: removeNodeAtPath(state.root, segments) };
}
