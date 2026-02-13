import { DataSource } from 'typeorm';
import DriveFileModel from './drive-file/drive-file.model';
import DriveFolderModel from './drive-folder/drive-folder.model';
import { DRIVE_SQLITE_FILE } from '../../constants/configs';

export class DatabaseService {
  public static readonly instance = new DatabaseService();

  public dataSource = new DataSource(
    process.env.NODE_ENV === 'test'
      ? {
          type: 'sqljs',
          autoSave: false,
          logging: false,
          synchronize: true,
          entities: [DriveFileModel, DriveFolderModel],
        }
      : {
          type: 'better-sqlite3',
          database: DRIVE_SQLITE_FILE,
          logging: false,
          synchronize: true,
          entities: [DriveFileModel, DriveFolderModel],
        },
  );

  public initialize = () => {
    return this.dataSource.initialize();
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
