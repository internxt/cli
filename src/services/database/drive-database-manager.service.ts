import { Sequelize } from 'sequelize-typescript';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { ConfigService } from '../config.service';
import { DriveFileRepository } from './drive-file/drive-file.repository';
import { DriveFolderRepository } from './drive-folder/drive-folder.repository';
import { DriveFile } from './drive-file/drive-file.domain';
import { DriveFolder } from './drive-folder/drive-folder.domain';

export class DriveDatabaseManager {
  private static sequelize: Sequelize;
  public static readonly DB_NAME = 'inxt';

  constructor(
    private driveFileRepository: DriveFileRepository,
    private driveFolderRepository: DriveFolderRepository,
  ) {}

  static init = () => {
    DriveDatabaseManager.sequelize = new Sequelize({
      database: DriveDatabaseManager.DB_NAME,
      dialect: 'sqlite',
      storage: ConfigService.DRIVE_SQLITE_FILE,
      models: [__dirname + '/**/*.model.ts'],
    });
  };

  static clean() {}

  findByRelativePath(relativePath: string): DriveFolderModelSchema | DriveFileModelSchema | null {
    const driveFile = this.driveFilesRealm.findByRelativePath(relativePath);

    if (driveFile) return driveFile;

    let folderRelativePath = relativePath;
    if (!relativePath.endsWith('/')) folderRelativePath = relativePath.concat('/');
    const driveFolder = this.driveFoldersRealm.findByRelativePath(folderRelativePath);

    if (driveFolder) return driveFolder;

    return null;
  }

  createFolder(driveFolder: DriveFolderItem) {
    const relativePath = this.buildRelativePathForFolder(driveFolder.name, driveFolder.parentId ?? null);

    return this.driveFoldersRealm.createOrReplace(driveFolder, relativePath);
  }

  createFile(driveFile: DriveFileItem) {
    const relativePath = this.buildRelativePathForFile(
      driveFile.type ? `${driveFile.name}.${driveFile.type}` : driveFile.name,
      driveFile.folderId,
    );

    return this.driveFilesRealm.createOrReplace(driveFile, relativePath);
  }

  buildRelativePathForFile(fileName: string, parentId: number | null): string {
    const parentFolder = this.driveFoldersRealm.findByParentId(parentId);

    if (!parentFolder) {
      return WebDavUtils.joinURL('/', fileName);
    }

    const parentPath = this.buildRelativePathForFile(parentFolder.name, parentFolder.parent_id ?? null);

    return WebDavUtils.joinURL(parentPath, fileName);
  }

  buildRelativePathForFolder(folderName: string, parentId: number | null): string {
    const parentFolder = this.driveFoldersRealm.findByParentId(parentId);

    if (!parentFolder) {
      return WebDavUtils.joinURL('/', folderName, '/');
    }

    const parentPath = this.buildRelativePathForFolder(parentFolder.name, parentFolder.parent_id ?? null);

    return WebDavUtils.joinURL(parentPath, folderName, '/');
  }
}
