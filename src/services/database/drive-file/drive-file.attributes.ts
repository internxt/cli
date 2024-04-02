export interface DriveFileAttributes {
  id: number;
  name: string;
  type?: string;
  uuid: string;
  fileId: string;
  folderId: number;
  bucket: string;
  relativePath: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  status: string;
}
