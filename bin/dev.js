#!/usr/bin/env node_modules/.bin/ts-node
/* eslint-disable */
require('dotenv').config({ path: __dirname + '/../.env', quiet: true });
(async () => {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: true, dir: __dirname });
})();
