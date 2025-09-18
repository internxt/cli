import { DriveFolderData, FileMeta } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Omit<
  FileMeta,
  | 'plainName'
  | 'userId'
  | 'encryptVersion'
  | 'size'
  | 'createdAt'
  | 'updatedAt'
  | 'creationTime'
  | 'modificationTime'
  | 'type'
> & {
  size: number;
  createdAt: Date;
  updatedAt: Date;
  creationTime: Date;
  modificationTime: Date;
  type?: string | null;
};

export type DriveFolderItem = Pick<DriveFolderData, 'name' | 'bucket' | 'id' | 'parentId'> & {
  encryptedName: string;
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'EXISTS' | 'TRASHED';
  parentUuid: string | null;
};
