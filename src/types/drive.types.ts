import { FileMeta, FolderMeta } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Pick<FileMeta, 'uuid' | 'fileId' | 'name' | 'bucket' | 'folderUuid' | 'status'> & {
  itemType: 'file';
  size: number;
  createdAt: Date;
  updatedAt: Date;
  creationTime: Date;
  modificationTime: Date;
  type?: string | null;
};

export type DriveFolderItem = Pick<FolderMeta, 'uuid' | 'name' | 'bucket'> & {
  itemType: 'folder';
  createdAt: Date;
  updatedAt: Date;
  status: 'EXISTS' | 'TRASHED';
  parentUuid: string | null;
};

export type DriveItem = DriveFileItem | DriveFolderItem;
