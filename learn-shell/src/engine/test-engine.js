// src/engine/test-engine.js
//
// A throwaway script to prove the engine works BEFORE any React is
// involved — this IS Stage 3's checkpoint. Run it with:
//
//     node src/engine/test-engine.js
//
// You can delete this file later, or keep it around as a quick
// sanity check whenever you change the engine.

import { createFilesystem } from './filesystem.js';
import { run } from './parser-bash.js';

let state = createFilesystem();

function tryCommand(input) {
  const result = run(input, state);
  console.log(`$ ${input}`);
  if (result.output) console.log(result.output);
  state = result.newState; // carry the updated state into the next command
  console.log('');
}

tryCommand('pwd'); // expect: /home/user
tryCommand('ls'); // expect: projects
tryCommand('cd /var/log');
tryCommand('pwd'); // expect: /var/log
tryCommand('ls'); // expect: system.log  error.log
tryCommand('cd ..');
tryCommand('pwd'); // expect: /var
tryCommand('cd nonsense'); // expect: No such file or directory