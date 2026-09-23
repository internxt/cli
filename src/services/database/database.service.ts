import { DataSource } from 'typeorm';
import { DriveItemModel } from './drive-item/drive-item.model';
import { DRIVE_SQLITE_FILE } from '../../constants/configs';
import { ConfigService } from '../config.service';
import { logger } from '../../utils/logger.utils';

type DatabasePragmas = { pragma: (source: string) => unknown };
type JournalMode = 'WAL' | 'DELETE';

export class DatabaseService {
  public static readonly instance = new DatabaseService();

  public dataSource = new DataSource(
    ConfigService.instance.get('NODE_ENV', false) === 'test'
      ? {
          type: 'sqljs',
          autoSave: false,
          logging: false,
          synchronize: true,
          entities: [DriveItemModel],
        }
      : {
          type: 'better-sqlite3',
          database: DRIVE_SQLITE_FILE,
          logging: false,
          synchronize: true,
          entities: [DriveItemModel],
          prepareDatabase: (db: DatabasePragmas) => DatabaseService.configureJournal(db),
        },
  );

  public static readonly configureJournal = (db: DatabasePragmas) => {
    const mode = DatabaseService.getJournalMode();
    try {
      const result = db.pragma(`journal_mode = ${mode}`) as { journal_mode?: string }[] | undefined;
      const activeMode = result?.[0]?.journal_mode;
      if (activeMode?.toUpperCase() !== mode) {
        logger.warn(`Could not set SQLite journal mode to ${mode}, using ${activeMode ?? 'unknown'} instead`);
        return;
      }
      if (mode === 'WAL') db.pragma('journal_size_limit = 16777216');
    } catch (error) {
      logger.warn(`Could not set SQLite journal mode to ${mode}: ${(error as Error).message}`);
    }
  };

  private static readonly getJournalMode = (): JournalMode => {
    const value = ConfigService.instance.get('INXT_SQLITE_JOURNAL_MODE', false).toUpperCase();
    if (value === 'DELETE') return 'DELETE';
    if (value && value !== 'WAL') {
      logger.warn(`Unknown INXT_SQLITE_JOURNAL_MODE "${value}", expected WAL or DELETE. Using WAL`);
    }
    return 'WAL';
  };

  public initialize = () => {
    if (!this.dataSource.isInitialized) {
      return this.dataSource.initialize();
    }
  };

  public destroy = () => {
    return this.dataSource.destroy();
  };

  public clear = () => {
    return this.dataSource.synchronize(true);
  };

  public drop = () => {
    return this.dataSource.dropDatabase();
  };
}
