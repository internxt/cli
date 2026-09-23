import { describe, expect, test, vi } from 'vitest';
import { DatabaseService } from '../../../src/services/database/database.service';
import { DriveItemModel } from '../../../src/services/database/drive-item/drive-item.model';
import { ConfigService } from '../../../src/services/config.service';
import { DRIVE_SQLITE_FILE } from '../../../src/constants/configs';
import { logger } from '../../../src/utils/logger.utils';

describe('Database Service', () => {
  describe('dataSource configuration', () => {
    test('when the environment is set to test, then the in-memory database is configured', () => {
      const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
      configServiceInstancespyOn.mockReturnValueOnce('test');

      const service = new DatabaseService();

      expect(service.dataSource.options.type).toBe('sqljs');
      expect(service.dataSource.options.synchronize).toBe(true);
      expect(service.dataSource.options.entities).toEqual([DriveItemModel]);
      expect(configServiceInstancespyOn).toHaveBeenCalledWith('NODE_ENV', false);
    });

    test('when the environment is not test, then a file-based database is configured', () => {
      const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
      configServiceInstancespyOn.mockReturnValueOnce('production');

      const service = new DatabaseService();

      expect(service.dataSource.options.type).toBe('better-sqlite3');
      expect(service.dataSource.options.database).toBe(DRIVE_SQLITE_FILE);
      expect(service.dataSource.options.synchronize).toBe(true);
      expect(service.dataSource.options.entities).toEqual([DriveItemModel]);
      expect(service.dataSource.options).toHaveProperty('prepareDatabase');
      expect(configServiceInstancespyOn).toHaveBeenCalledWith('NODE_ENV', false);
    });
  });

  describe('configureJournal', () => {
    const mockJournalMode = (value: string) => vi.spyOn(ConfigService.instance, 'get').mockReturnValueOnce(value);

    test('when no journal mode is configured, then WAL mode and the journal size limit are set', () => {
      mockJournalMode('');
      const db = { pragma: vi.fn().mockReturnValueOnce([{ journal_mode: 'wal' }]) };

      DatabaseService.configureJournal(db);

      expect(db.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      expect(db.pragma).toHaveBeenCalledWith('journal_size_limit = 16777216');
    });

    test('when the journal mode is set to delete, then the rollback journal is used without a size limit', () => {
      mockJournalMode('delete');
      const db = { pragma: vi.fn().mockReturnValueOnce([{ journal_mode: 'delete' }]) };

      DatabaseService.configureJournal(db);

      expect(db.pragma).toHaveBeenCalledWith('journal_mode = DELETE');
      expect(db.pragma).toHaveBeenCalledTimes(1);
    });

    test('when the journal mode is unknown, then a warning is logged and WAL mode is used', () => {
      mockJournalMode('truncate');
      const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(logger);
      const db = { pragma: vi.fn().mockReturnValueOnce([{ journal_mode: 'wal' }]) };

      DatabaseService.configureJournal(db);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE'));
      expect(db.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    test('when SQLite falls back to another journal mode, then a warning is logged and no size limit is set', () => {
      mockJournalMode('');
      const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(logger);
      const db = { pragma: vi.fn().mockReturnValueOnce([{ journal_mode: 'memory' }]) };

      DatabaseService.configureJournal(db);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('using memory instead'));
      expect(db.pragma).toHaveBeenCalledTimes(1);
    });

    test('when setting the journal mode fails, then the error is logged and not thrown', () => {
      mockJournalMode('');
      const db = {
        pragma: vi.fn().mockImplementation(() => {
          throw new Error('database is locked');
        }),
      };
      const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(logger);

      expect(() => DatabaseService.configureJournal(db)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('database is locked'));
    });
  });

  describe('Integration scenarios', () => {
    test('when the database is initialized, cleared, and destroyed, then the sequence completes successfully', async () => {
      const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
      configServiceInstancespyOn.mockReturnValueOnce('test');

      const service = new DatabaseService();

      const initializeSpy = vi.spyOn(service.dataSource, 'initialize').mockResolvedValue(service.dataSource);
      const clearSpy = vi.spyOn(service.dataSource, 'synchronize').mockResolvedValue(undefined);
      const destroySpy = vi.spyOn(service.dataSource, 'destroy').mockResolvedValue(undefined);

      await service.initialize();
      await service.clear();
      await service.destroy();

      expect(initializeSpy).toHaveBeenCalledTimes(1);
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(destroySpy).toHaveBeenCalledTimes(1);
    });
  });
});
