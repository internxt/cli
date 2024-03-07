import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Pick<DriveFileData, 'name' | 'bucket' | 'fileId' | 'id' | 'uuid' | 'type'> & {
  encryptedName: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DriveFolderItem = Pick<DriveFolderData, 'name' | 'bucket' | 'id'> & {
  encryptedName: string;
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
};
