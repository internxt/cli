import { DriveFolderItem } from '../../../types/drive.types';
import { DriveFolderAttributes } from './drive-folder.attributes';

export class DriveFolder implements DriveFolderAttributes {
  name: string;
  uuid: string;
  parentUuid: string | null;
  status: DriveFolderAttributes['status'];
  createdAt: Date;
  updatedAt: Date;
  creationTime: Date;
  modificationTime: Date;

  constructor({
    name,
    uuid,
    parentUuid,
    createdAt,
    updatedAt,
    status,
    creationTime,
    modificationTime,
  }: DriveFolderAttributes) {
    this.name = name;
    this.uuid = uuid;
    this.parentUuid = parentUuid;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.creationTime = creationTime;
    this.modificationTime = modificationTime;
  }

  static build(folder: DriveFolderAttributes): DriveFolder {
    return new DriveFolder(folder);
  }

  public toJSON(): DriveFolderAttributes {
    return {
      name: this.name,
      uuid: this.uuid,
      status: this.status,
      parentUuid: this.parentUuid,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creationTime: this.creationTime,
      modificationTime: this.modificationTime,
    };
  }

  public toItem(): DriveFolderItem {
    return {
      itemType: 'folder',
      name: this.name,
      uuid: this.uuid,
      status: this.status,
      parentUuid: this.parentUuid,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creationTime: this.creationTime,
      modificationTime: this.modificationTime,
      bucket: null,
    };
  }
}
