#!/usr/bin/env node
/* eslint-disable */
require('dotenv').config({ path: __dirname + '/../.env' });
(async () => {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: false, dir: __dirname });
})();
