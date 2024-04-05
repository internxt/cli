export interface DriveFolderAttributes {
  id: number;
  name: string;
  uuid: string;
  relativePath: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
