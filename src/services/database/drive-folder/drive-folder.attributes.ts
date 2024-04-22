export interface DriveFolderAttributes {
  id: number;
  name: string;
  uuid: string;
  status: 'EXISTS' | 'TRASHED';
  relativePath: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
