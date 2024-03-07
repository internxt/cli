import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { aes } from '@internxt/lib';
import { ConfigService } from '../config.service';
import { CryptoUtils } from '../../utils/crypto.utils';
import { DriveFileItem } from '../../types/drive.types';

export class DriveFileService {
  static readonly instance = new DriveFileService();

  async createFile(payload: {
    name: string;
    type: string;
    size: number;
    folderId: number;
    fileId: string;
    bucket: string;
  }): Promise<DriveFileItem> {
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
      size: driveFile.size,
      uuid: driveFile.uuid,
      encryptedName,
      name: payload.name,
      bucket: payload.bucket,
      createdAt: new Date(driveFile.createdAt),
      updatedAt: new Date(driveFile.updatedAt),
      fileId: payload.fileId,
      id: driveFile.id,
      type: payload.type,
    };
  }

  async getFileMetadata(uuid: string): Promise<DriveFileItem> {
    const storageClient = SdkManager.instance.getStorage(true);

    const [getFileMetadata] = storageClient.getFile(uuid);

    const fileMetadata = await getFileMetadata;
    return {
      uuid,
      size: fileMetadata.size,
      encryptedName: fileMetadata.name,
      name: fileMetadata.plainName ?? fileMetadata.name,
      bucket: fileMetadata.bucket,
      createdAt: new Date(fileMetadata.createdAt),
      updatedAt: new Date(fileMetadata.updatedAt),
      fileId: fileMetadata.fileId,
      id: fileMetadata.id,
      type: fileMetadata.type,
    };
  }
}
