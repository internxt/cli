export interface DriveFileAttributes {
  id: number;
  name: string;
  type?: string;
  uuid: string;
  fileId: string;
  folderId: number;
  folderUuid: string;
  bucket: string;
  relativePath: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
  creationTime: Date;
  modificationTime: Date;
}
