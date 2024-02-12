#!/usr/bin/env node
/* eslint-disable */
require('dotenv').config();
(async () => {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: false, dir: __dirname });
})();
