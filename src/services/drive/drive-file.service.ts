import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { DriveFileItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { AuthService } from '../auth.service';
import { FileRepository } from '../database/drive-file/drive-file.repository';
import { DriveFolderService } from './drive-folder.service';
import { NotFoundError } from '../../utils/errors.utils';
import { PathUtils } from '../../utils/path.utils';
import { logger } from '../../utils/logger.utils';

export class DriveFileService {
  static readonly instance = new DriveFileService();

  public createFile = async (payload: StorageTypes.FileEntryByUuid): Promise<DriveFileItem> => {
    const driveFile = await this.createDriveFileEntry(payload);

    const driveFileItem: DriveFileItem = {
      itemType: 'file',
      name: payload.plainName,
      uuid: driveFile.uuid,
      size: driveFile.size,
      bucket: driveFile.bucket,
      createdAt: new Date(driveFile.createdAt),
      updatedAt: new Date(driveFile.updatedAt),
      fileId: driveFile.fileId ?? null,
      type: driveFile.type ?? null,
      status: driveFile.status as DriveFileItem['status'],
      folderUuid: driveFile.folderUuid,
      creationTime: new Date(driveFile.creationTime ?? driveFile.createdAt),
      modificationTime: new Date(driveFile.modificationTime ?? driveFile.updatedAt),
    };
    await FileRepository.instance.createOrUpdate([driveFileItem]);

    return driveFileItem;
  };

  private createDriveFileEntry = async (payload: StorageTypes.FileEntryByUuid): Promise<StorageTypes.DriveFileData> => {
    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();

    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      return workspaceClient.createFileEntry(
        {
          name: payload.plainName,
          plainName: payload.plainName,
          bucket: payload.bucket,
          fileId: payload.fileId ?? '',
          encryptVersion: StorageTypes.EncryptionVersion.Aes03,
          folderUuid: payload.folderUuid,
          size: payload.size,
          type: payload.type ?? '',
          modificationTime: payload.modificationTime ?? new Date().toISOString(),
          date: payload.date ?? new Date().toISOString(),
        },
        currentWorkspace.workspaceCredentials.id,
      );
    }

    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createFileEntryByUuid(payload);
  };

  public getFileMetadata = async (uuid: string): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();

    const [getFileMetadata] = storageClient.getFile(uuid);

    const fileMetadata = await getFileMetadata;
    const driveFileItem = DriveUtils.driveFileMetaToItem(fileMetadata);

    await FileRepository.instance.createOrUpdate([driveFileItem]);

    return driveFileItem;
  };

  public moveFile = async (uuid: string, payload: StorageTypes.MoveFileUuidPayload): Promise<StorageTypes.FileMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    const fileMeta = await storageClient.moveFileByUuid(uuid, payload);

    const driveFileItem = DriveUtils.driveFileMetaToItem(fileMeta);
    await FileRepository.instance.createOrUpdate([driveFileItem]);

    return fileMeta;
  };

  public renameFile = async (
    fileUuid: string,
    payload: { plainName?: string; type?: string | null },
  ): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    await storageClient.updateFileMetaByUUID(fileUuid, payload);
    await FileRepository.instance.updateByUuid(fileUuid, { name: payload.plainName, type: payload.type });
  };

  public getByParentUuidAndName = async (
    parentUuid: string,
    name: string,
    type: string | null,
  ): Promise<DriveFileItem> => {
    const subFiles = await DriveFolderService.instance.getFolderSubfiles(parentUuid);
    const fileMeta = subFiles.find(
      (file) => (file.plainName === name || file.name === name) && (file.type ?? null) === type,
    );
    if (!fileMeta) {
      throw new NotFoundError('File not found');
    }
    return DriveUtils.driveFileMetaToItem(fileMeta);
  };

  public getFileMetadataByPath = async (path: string): Promise<DriveFileItem> => {
    const { fileName, fileType, folderPath } = PathUtils.getPathFileData(path);

    const parentFolder = await DriveFolderService.instance.getFolderMetadataByPath(folderPath);

    const localFileDB = await FileRepository.instance.getByParentUuidNameAndType(parentFolder.uuid, fileName, fileType);
    if (localFileDB) {
      try {
        const file = await this.getFileMetadata(localFileDB.uuid);
        if (file) {
          return file;
        }
      } catch {
        logger.error('File not found when getting file by path on local DB', { path });
      }
    }

    return this.getByParentUuidAndName(parentFolder.uuid, fileName, fileType);
  };

  public createThumbnail = (payload: StorageTypes.CreateThumbnailEntryPayload): Promise<StorageTypes.Thumbnail> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createThumbnailEntryWithUUID(payload);
  };
}
