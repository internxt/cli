import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Pick<
  DriveFileData,
  'name' | 'bucket' | 'createdAt' | 'updatedAt' | 'fileId' | 'id' | 'uuid' | 'type'
> & { encryptedName: string };

export type DriveFolderItem = Pick<DriveFolderData, 'name' | 'bucket' | 'id'> & {
  encryptedName: string;
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
};
