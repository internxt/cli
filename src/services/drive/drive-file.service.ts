import { aes } from '@internxt/lib';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { ConfigService } from '../config.service';
import { CryptoUtils } from '../../utils/crypto.utils';
import { DriveFileItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';

export class DriveFileService {
  static readonly instance = new DriveFileService();

  public createFile = async (payload: {
    name: string;
    type: string;
    size: number;
    folderId: number;
    fileId: string;
    bucket: string;
  }): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const encryptedName = aes.encrypt(
      payload.name,
      `${ConfigService.instance.get('APP_CRYPTO_SECRET2')}-${payload.folderId}`,
      CryptoUtils.getAesInit(),
    );
    const driveFile = await storageClient.createFileEntry({
      name: encryptedName,
      size: payload.size,
      folder_id: payload.folderId,
      id: payload.fileId,
      type: payload.type,
      plain_name: payload.name,
      bucket: payload.bucket,
      encrypt_version: EncryptionVersion.Aes03,
    });

    return {
      size: Number(driveFile.size),
      uuid: driveFile.uuid,
      encryptedName,
      name: payload.name,
      bucket: payload.bucket,
      createdAt: new Date(driveFile.createdAt),
      updatedAt: new Date(driveFile.updatedAt),
      fileId: payload.fileId,
      id: driveFile.id,
      type: payload.type,
      status: driveFile.status,
      folderId: driveFile.folderId,
      folderUuid: driveFile.folderUuid,
    };
  };

  public getFileMetadata = async (uuid: string): Promise<DriveFileItem> => {
    const storageClient = SdkManager.instance.getStorage(true);

    const [getFileMetadata] = storageClient.getFile(uuid);

    const fileMetadata = await getFileMetadata;
    return DriveUtils.driveFileMetaToItem(fileMetadata);
  };

  public moveFile = (payload: StorageTypes.MoveFileUuidPayload): Promise<StorageTypes.FileMeta> => {
    const storageClient = SdkManager.instance.getStorage(true);
    return storageClient.moveFileByUuid(payload);
  };

  public renameFile = (payload: { fileUuid: string; name: string }): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage(true);
    return storageClient.updateFileNameWithUUID(payload);
  };
}
