import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { DriveFileItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { AuthService } from '../auth.service';
import { NotFoundError } from '../../utils/errors.utils';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';

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
    if (fileMetadata?.status !== FileStatus.EXISTS) {
      throw new NotFoundError(`File with uuid ${uuid} not found`);
    }
    const driveFileItem = DriveUtils.driveFileMetaToItem(fileMetadata);

    return driveFileItem;
  };

  public moveFile = async (uuid: string, payload: StorageTypes.MoveFileUuidPayload): Promise<StorageTypes.FileMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    const fileMeta = await storageClient.moveFileByUuid(uuid, payload);

    return fileMeta;
  };

  public renameFile = async (
    fileUuid: string,
    payload: { plainName?: string; type?: string | null },
  ): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    await storageClient.updateFileMetaByUUID(fileUuid, payload);
  };

  public createThumbnail = (payload: StorageTypes.CreateThumbnailEntryPayload): Promise<StorageTypes.Thumbnail> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createThumbnailEntryWithUUID(payload);
  };
}
