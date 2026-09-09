#!/usr/bin/env node
/* eslint-disable */
require('dotenv').config({ path: __dirname + '/../.env', quiet: true });

// Some dependencies (e.g. @internxt/inxt-js's upload stream pipeline) can leave an
// orphaned promise that rejects with an AbortError when a network request fails mid-stream.
// That rejection never reaches our own try/catch blocks, and Node terminates the whole
// process by default. Log it instead so commands with their own retry/skip logic
// (e.g. upload-folder) can keep going.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

(async () => {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: false, dir: __dirname });
})();
