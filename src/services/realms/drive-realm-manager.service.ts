import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFileRealmSchema, DriveFilesRealm } from './drive-files.realm';
import { DriveFolderRealmSchema, DriveFoldersRealm } from './drive-folders.realm';
import { WebDavUtils } from '../../utils/webdav.utils';

export class DriveRealmManager {
  constructor(
    private driveFilesRealm: DriveFilesRealm,
    private driveFoldersRealm: DriveFoldersRealm,
  ) {}

  findByRelativePath(relativePath: string): DriveFolderRealmSchema | DriveFileRealmSchema | null {
    const driveFile = this.driveFilesRealm.findByRelativePath(relativePath);

    if (driveFile) return driveFile;

    const driveFolder = this.driveFoldersRealm.findByRelativePath(relativePath);

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
