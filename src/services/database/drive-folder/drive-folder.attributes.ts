export interface DriveFolderAttributes {
  uuid: string;
  name: string;
  status: 'EXISTS' | 'TRASHED';
  parentUuid: string | null;
  createdAt: Date;
  updatedAt: Date;
}
