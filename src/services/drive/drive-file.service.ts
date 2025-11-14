import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { DriveFileItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';

export class DriveFileService {
  static readonly instance = new DriveFileService();

  public createFile = async (payload: StorageTypes.FileEntryByUuid): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const driveFile = await storageClient.createFileEntryByUuid(payload);

    return {
      itemType: 'file',
      name: payload.plainName,
      id: driveFile.id,
      uuid: driveFile.uuid,
      size: driveFile.size,
      bucket: driveFile.bucket,
      createdAt: new Date(driveFile.createdAt),
      updatedAt: new Date(driveFile.updatedAt),
      fileId: driveFile.fileId,
      type: driveFile.type,
      status: driveFile.status as DriveFileItem['status'],
      folderId: driveFile.folderId,
      folderUuid: driveFile.folderUuid,
      creationTime: new Date(driveFile.creationTime ?? driveFile.createdAt),
      modificationTime: new Date(driveFile.modificationTime ?? driveFile.updatedAt),
    };
  };

  public getFileMetadata = async (uuid: string): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();

    const [getFileMetadata] = storageClient.getFile(uuid);

    const fileMetadata = await getFileMetadata;
    return DriveUtils.driveFileMetaToItem(fileMetadata);
  };

  public moveFile = (uuid: string, payload: StorageTypes.MoveFileUuidPayload): Promise<StorageTypes.FileMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.moveFileByUuid(uuid, payload);
  };

  public renameFile = (fileUuid: string, payload: { plainName?: string; type?: string | null }): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.updateFileMetaByUUID(fileUuid, payload);
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
