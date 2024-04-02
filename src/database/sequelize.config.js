require('ts-node/register');
const { ConfigService } = require('../services/config.service');
const { DriveDatabaseManager } = require('../services/database/drive-database-manager.service');

module.exports = {
  database: DriveDatabaseManager.DB_NAME,
  dialect: 'sqlite',
  storage: ConfigService.DRIVE_SQLITE_FILE,
  models: ['../services/database/**/*.model.ts'],
};
