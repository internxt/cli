import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileItem = Pick<
  DriveFileData,
  'name' | 'bucket' | 'createdAt' | 'updatedAt' | 'fileId' | 'id' | 'uuid'
> & { encryptedName: string };
