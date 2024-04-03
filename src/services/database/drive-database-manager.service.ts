import { Sequelize } from 'sequelize-typescript';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { ConfigService } from '../config.service';
import { DriveFileRepository } from './drive-file/drive-file.repository';
import { DriveFolderRepository } from './drive-folder/drive-folder.repository';
import { DriveFile } from './drive-file/drive-file.domain';
import { DriveFolder } from './drive-folder/drive-folder.domain';

export class DriveDatabaseManager {
  private static readonly sequelize: Sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ConfigService.DRIVE_SQLITE_FILE,
    models: [__dirname + '/**/*.model.ts'],
  });

  constructor(
    private driveFileRepository: DriveFileRepository,
    private driveFolderRepository: DriveFolderRepository,
  ) {}

  static readonly init = async () => {
    await DriveDatabaseManager.sequelize.sync();
  };

  static readonly clean = async () => {
    await DriveFileRepository.clean();
    await DriveFolderRepository.clean();
  };

  findByRelativePath = async (relativePath: string): Promise<DriveFolder | DriveFile | null> => {
    const driveFile = await this.driveFileRepository.findByRelativePath(relativePath);

    if (driveFile) return driveFile;

    let folderRelativePath = relativePath;
    if (!relativePath.endsWith('/')) folderRelativePath = relativePath.concat('/');
    const driveFolder = await this.driveFolderRepository.findByRelativePath(folderRelativePath);

    if (driveFolder) return driveFolder;

    return null;
  };

  createFolder = async (driveFolder: DriveFolderItem) => {
    const relativePath = await this.buildRelativePathForFolder(driveFolder.name, driveFolder.parentId ?? null);

    const existingObject = await this.driveFolderRepository.findById(driveFolder.id);
    if (existingObject) await this.driveFolderRepository.deleteById(existingObject.id);

    return await this.driveFolderRepository.createFolder(driveFolder, relativePath);
  };

  createFile = async (driveFile: DriveFileItem) => {
    const relativePath = await this.buildRelativePathForFile(
      driveFile.type ? `${driveFile.name}.${driveFile.type}` : driveFile.name,
      driveFile.folderId,
    );

    const existingObject = await this.driveFileRepository.findById(driveFile.id);
    if (existingObject) await this.driveFileRepository.deleteById(existingObject.id);

    return await this.driveFileRepository.createFile(driveFile, relativePath);
  };

  buildRelativePathForFile = async (fileName: string, parentId: number | null): Promise<string> => {
    const parentFolder = await this.driveFolderRepository.findById(parentId ?? -1);

    if (!parentFolder) {
      return WebDavUtils.joinURL('/', fileName);
    }

    const parentPath = await this.buildRelativePathForFile(parentFolder.name, parentFolder.parentId);

    return WebDavUtils.joinURL(parentPath, fileName);
  };

  buildRelativePathForFolder = async (folderName: string, parentId: number | null): Promise<string> => {
    const parentFolder = await this.driveFolderRepository.findById(parentId ?? -1);

    if (!parentFolder) {
      return WebDavUtils.joinURL('/', folderName, '/');
    }

    const parentPath = await this.buildRelativePathForFolder(parentFolder.name, parentFolder.parentId);

    return WebDavUtils.joinURL(parentPath, folderName, '/');
  };
}
