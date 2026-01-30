import { DriveFolderItem } from '../../../types/drive.types';
import { DriveFolderAttributes } from './drive-folder.attributes';

export class DriveFolder implements DriveFolderAttributes {
  name: string;
  uuid: string;
  parentUuid: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: DriveFolderAttributes['status'];

  constructor({ name, uuid, parentUuid, createdAt, updatedAt, status }: DriveFolderAttributes) {
    this.name = name;
    this.uuid = uuid;
    this.parentUuid = parentUuid;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.status = status;
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
      bucket: null,
    };
  }
}
