import { DriveFolderAttributes } from './drive-folder.attributes';

export class DriveFolder implements DriveFolderAttributes {
  id: number;
  name: string;
  uuid: string;
  relativePath: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor({ id, name, uuid, relativePath, parentId, createdAt, updatedAt }: DriveFolderAttributes) {
    this.id = id;
    this.name = name;
    this.uuid = uuid;
    this.relativePath = relativePath;
    this.parentId = parentId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static build(folder: DriveFolderAttributes): DriveFolder {
    return new DriveFolder(folder);
  }

  public toJSON(): DriveFolderAttributes {
    return {
      id: this.id,
      name: this.name,
      uuid: this.uuid,
      relativePath: this.relativePath,
      parentId: this.parentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}