export interface DriveFileAttributes {
  uuid: string;
  name: string;
  type?: string;
  fileId: string;
  folderUuid: string;
  bucket: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
  creationTime: Date;
  modificationTime: Date;
}
