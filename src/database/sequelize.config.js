/* eslint-disable */
require('ts-node/register');
const { ConfigService } = require('../services/config.service');

module.exports = {
  dialect: 'sqlite',
  storage: ConfigService.DRIVE_SQLITE_FILE,
  models: ['../services/database/**/*.model.ts'],
};
