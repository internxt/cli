import { Sequelize } from 'sequelize-typescript';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { ConfigService } from '../config.service';
import { DriveFileRepository } from './drive-file/drive-file.repository';
import { DriveFolderRepository } from './drive-folder/drive-folder.repository';
import DriveFileModel from './drive-file/drive-file.model';
import DriveFolderModel from './drive-folder/drive-folder.model';
import { DriveFile } from './drive-file/drive-file.domain';
import { DriveFolder } from './drive-folder/drive-folder.domain';

export class DriveDatabaseManager {
  private static readonly sequelize: Sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ConfigService.DRIVE_SQLITE_FILE,
    models: [DriveFileModel, DriveFolderModel],
    logging: false,
  });

  constructor(
    private driveFileRepository: DriveFileRepository,
    private driveFolderRepository: DriveFolderRepository,
  ) {}

  static readonly init = async () => {
    await DriveDatabaseManager.sequelize.sync({ force: true });
  };

  static readonly clean = async () => {
    await DriveFileRepository.clean();
    await DriveFolderRepository.clean();
  };

  findFileByRelativePath = async (relativePath: string): Promise<DriveFile | null> => {
    const driveFile = await this.driveFileRepository.findByRelativePath(relativePath);
    return driveFile ?? null;
  };

  findFolderByRelativePath = async (relativePath: string): Promise<DriveFolder | null> => {
    const folderRelativePath = relativePath.endsWith('/') ? relativePath : relativePath.concat('/');

    const driveFolder = await this.driveFolderRepository.findByRelativePath(folderRelativePath);
    return driveFolder ?? null;
  };

  createFolder = async (driveFolder: DriveFolderItem, relativePath: string) => {
    await this.deleteFolderById(driveFolder.id);
    await this.deleteFolderByPath(relativePath);

    return await this.driveFolderRepository.createFolder(driveFolder, relativePath);
  };

  createFile = async (driveFile: DriveFileItem, relativePath: string) => {
    await this.deleteFileById(driveFile.id);
    await this.deleteFileByPath(relativePath);

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

  deleteFileById = async (id: number): Promise<void> => {
    const existingObject = await this.driveFileRepository.findById(id);
    if (existingObject) {
      await this.driveFileRepository.deleteById(existingObject.id);
    }
  };

  deleteFolderById = async (id: number): Promise<void> => {
    const existingObject = await this.driveFolderRepository.findById(id);
    if (existingObject) {
      await this.driveFolderRepository.deleteById(existingObject.id);
    }
  };

  deleteFileByPath = async (relativePath: string): Promise<void> => {
    const existingPath = await this.driveFileRepository.findByRelativePath(relativePath);
    if (existingPath) await this.driveFileRepository.deleteById(existingPath.id);
  };

  deleteFolderByPath = async (relativePath: string): Promise<void> => {
    const existingPath = await this.driveFolderRepository.findByRelativePath(relativePath);
    if (existingPath) {
      await this.driveFolderRepository.deleteById(existingPath.id);
    }
  };
}
