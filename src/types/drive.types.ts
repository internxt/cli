import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Pick<
  DriveFileData,
  'name' | 'bucket' | 'fileId' | 'id' | 'uuid' | 'folderId' | 'status' | 'folderUuid'
> & {
  encryptedName: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  type?: string;
};

export type DriveFolderItem = Pick<DriveFolderData, 'name' | 'bucket' | 'id' | 'parentId'> & {
  encryptedName: string;
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'EXISTS' | 'TRASHED';
  parentUuid: string | null;
};
