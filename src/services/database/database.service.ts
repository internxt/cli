import { DataSource } from 'typeorm';
import { DriveItemModel } from './drive-item/drive-item.model';
import { DRIVE_SQLITE_FILE } from '../../constants/configs';
import { ConfigService } from '../config.service';

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
        },
  );

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
