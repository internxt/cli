import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { DriveFileItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { AuthService } from '../auth.service';
import { FileRepository } from '../database/drive-file/drive-file.repository';

export class DriveFileService {
  static readonly instance = new DriveFileService();

  public createFile = async (payload: StorageTypes.FileEntryByUuid): Promise<DriveFileItem> => {
    let driveFile: StorageTypes.DriveFileData;

    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      driveFile = await workspaceClient.createFileEntry(
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
    } else {
      const storageClient = SdkManager.instance.getStorage();
      driveFile = await storageClient.createFileEntryByUuid(payload);
    }

    const driveFileItem: DriveFileItem = {
      itemType: 'file',
      name: payload.plainName,
      uuid: driveFile.uuid,
      size: driveFile.size,
      bucket: driveFile.bucket,
      createdAt: new Date(driveFile.createdAt),
      updatedAt: new Date(driveFile.updatedAt),
      fileId: driveFile.fileId,
      type: driveFile.type,
      status: driveFile.status as DriveFileItem['status'],
      folderUuid: driveFile.folderUuid,
      creationTime: new Date(driveFile.creationTime ?? driveFile.createdAt),
      modificationTime: new Date(driveFile.modificationTime ?? driveFile.updatedAt),
    };
    FileRepository.instance.createOrUpdate([driveFileItem]);

    return driveFileItem;
  };

  public getFileMetadata = async (uuid: string): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();

    const [getFileMetadata] = storageClient.getFile(uuid);

    const fileMetadata = await getFileMetadata;
    const driveFileItem = DriveUtils.driveFileMetaToItem(fileMetadata);

    FileRepository.instance.createOrUpdate([driveFileItem]);

    return driveFileItem;
  };

  public moveFile = async (uuid: string, payload: StorageTypes.MoveFileUuidPayload): Promise<StorageTypes.FileMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    const fileMeta = await storageClient.moveFileByUuid(uuid, payload);

    const driveFileItem = DriveUtils.driveFileMetaToItem(fileMeta);
    FileRepository.instance.createOrUpdate([driveFileItem]);

    return fileMeta;
  };

  public renameFile = async (
    fileUuid: string,
    payload: { plainName?: string; type?: string | null },
  ): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    await storageClient.updateFileMetaByUUID(fileUuid, payload);
    FileRepository.instance.updateByUuid(fileUuid, { name: payload.plainName, type: payload.type });
  };

  public getFileMetadataByPath = async (path: string): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const fileMetadata = await storageClient.getFileByPath(encodeURIComponent(path));
    return DriveUtils.driveFileMetaToItem(fileMetadata);
  };

  public createThumbnail = (payload: StorageTypes.CreateThumbnailEntryPayload): Promise<StorageTypes.Thumbnail> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createThumbnailEntryWithUUID(payload);
  };
}
