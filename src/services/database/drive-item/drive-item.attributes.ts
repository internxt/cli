export interface DriveItemAttributes {
  uuid: string;
  path: string;
  type: 'file' | 'folder';
  createdAt: Date;
  updatedAt: Date;
}
