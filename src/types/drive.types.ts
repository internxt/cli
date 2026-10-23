import { FileMeta, FileStatus, FolderMeta } from '@internxt/sdk/dist/drive/storage/types';

export type DriveItemType = 'file' | 'folder';

// The API sends these on folders, but the SDK folder types do not declare them yet.
export type WithFolderStatus<T> = T & { status: FileStatus };
export type FolderMetaResponse = WithFolderStatus<FolderMeta> & { creationTime: string; modificationTime: string };

export type DriveFileItem = Pick<FileMeta, 'uuid' | 'name' | 'bucket' | 'folderUuid' | 'status'> & {
  itemType: 'file';
  size: number;
  createdAt: Date;
  updatedAt: Date;
  creationTime: Date;
  modificationTime: Date;
  type: string | null;
  fileId: string | null;
};

export type DriveFolderItem = Pick<FolderMeta, 'uuid' | 'name' | 'bucket'> & {
  itemType: 'folder';
  createdAt: Date;
  updatedAt: Date;
  creationTime: Date;
  modificationTime: Date;
  status: `${FileStatus}`;
  parentUuid: string | null;
};

export type DriveItem = DriveFileItem | DriveFolderItem;
