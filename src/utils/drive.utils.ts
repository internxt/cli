import { FileMeta, FolderMeta } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';

export class DriveUtils {
  static driveFileMetaToItem(fileMeta: FileMeta): DriveFileItem {
    return {
      uuid: fileMeta.uuid ?? '',
      status: fileMeta.status,
      folderId: fileMeta.folderId ?? fileMeta.folder_id,
      folderUuid: fileMeta.folderUuid,
      size: fileMeta.size,
      encryptedName: fileMeta.name,
      name: fileMeta.plainName ?? fileMeta.name,
      bucket: fileMeta.bucket,
      createdAt: new Date(fileMeta.createdAt),
      updatedAt: new Date(fileMeta.updatedAt),
      fileId: fileMeta.fileId,
      id: fileMeta.id,
      type: fileMeta.type,
    };
  }

  static driveFolderMetaToItem(folderMeta: FolderMeta): DriveFolderItem {
    return {
      uuid: folderMeta.uuid,
      id: folderMeta.id,
      bucket: folderMeta.bucket,
      status: folderMeta.deleted || folderMeta.removed ? 'TRASHED' : 'EXISTS',
      name: folderMeta.plainName ?? folderMeta.name,
      encryptedName: folderMeta.name,
      parentId: folderMeta.parentId,
      parentUuid: folderMeta.parentUuid,
      createdAt: new Date(folderMeta.createdAt),
      updatedAt: new Date(folderMeta.updatedAt),
    };
  }
}
