import path from 'path';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveFilesRealm } from './drive-files.realm';
import { DriveFoldersRealm } from './drive-folders.realm';

export class DriveRealmManager {
  constructor(
    private driveFilesRealm: DriveFilesRealm,
    private driveFoldersRealm: DriveFoldersRealm,
  ) {}

  async findByRelativePath(relativePath: string) {
    const driveFile = await this.driveFilesRealm.getByRelativePath(relativePath);

    if (driveFile) return driveFile;

    const driveFolder = await this.driveFoldersRealm.findByRelativePath(relativePath);

    if (driveFolder) return driveFolder;

    return null;
  }

  async createFolder(driveFolder: DriveFolderItem) {
    const relativePath = await this.buildRelativePathForFolder(driveFolder.name, driveFolder.parentId ?? null);

    return this.driveFoldersRealm.createOrReplace(driveFolder, relativePath);
  }

  async buildRelativePathForFolder(folderName: string, parentId: number | null): Promise<string> {
    const parentFolder = await this.driveFoldersRealm.findByParentId(parentId);

    if (!parentFolder) {
      return path.join('/', folderName, '/');
    }

    const parentPath = await this.buildRelativePathForFolder(parentFolder.name, parentFolder.parent_id ?? null);

    return path.join(parentPath, folderName, '/');
  }

  async close() {}
}
