import { FileMeta, FolderMeta, CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';

export class DriveUtils {
  static driveFileMetaToItem(fileMeta: FileMeta): DriveFileItem {
    return {
      itemType: 'file',
      uuid: fileMeta.uuid ?? '',
      status: fileMeta.status,
      folderUuid: fileMeta.folderUuid,
      size: Number(fileMeta.size),
      name: fileMeta.plainName ?? fileMeta.name,
      bucket: fileMeta.bucket,
      createdAt: new Date(fileMeta.createdAt),
      updatedAt: new Date(fileMeta.updatedAt),
      creationTime: new Date(fileMeta.creationTime ?? fileMeta.createdAt),
      modificationTime: new Date(fileMeta.modificationTime ?? fileMeta.updatedAt),
      fileId: fileMeta.fileId,
      type: fileMeta.type,
    };
  }

  static driveFolderMetaToItem(folderMeta: FolderMeta): DriveFolderItem {
    return {
      itemType: 'folder',
      uuid: folderMeta.uuid,
      bucket: folderMeta.bucket,
      status: folderMeta.deleted || folderMeta.removed ? 'TRASHED' : 'EXISTS',
      name: folderMeta.plainName ?? folderMeta.name,
      parentUuid: folderMeta.parentUuid,
      createdAt: new Date(folderMeta.createdAt),
      updatedAt: new Date(folderMeta.updatedAt),
    };
  }

  static createFolderResponseToItem(folderResponse: CreateFolderResponse): DriveFolderItem {
    return {
      itemType: 'folder',
      uuid: folderResponse.uuid,
      bucket: folderResponse.bucket,
      status: folderResponse.deleted || folderResponse.removed ? 'TRASHED' : 'EXISTS',
      name: folderResponse.plainName ?? folderResponse.name,
      parentUuid: folderResponse.parentUuid,
      createdAt: new Date(folderResponse.createdAt),
      updatedAt: new Date(folderResponse.updatedAt),
    };
  }
}
