import { describe, expect, test, vi } from 'vitest';
import { DatabaseService } from '../../../src/services/database/database.service';
import { DriveItemModel } from '../../../src/services/database/drive-item/drive-item.model';
import { ConfigService } from '../../../src/services/config.service';
import { DRIVE_SQLITE_FILE } from '../../../src/constants/configs';

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
      expect(configServiceInstancespyOn).toHaveBeenCalledWith('NODE_ENV', false);
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
