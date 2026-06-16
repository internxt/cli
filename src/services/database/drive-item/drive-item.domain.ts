import { DriveItemAttributes } from './drive-item.attributes';

export class DriveItemBD implements DriveItemAttributes {
  uuid: string;
  path: string;
  type: 'file' | 'folder';
  createdAt: Date;
  updatedAt: Date;

  constructor({ uuid, path, type, createdAt, updatedAt }: DriveItemAttributes) {
    this.uuid = uuid;
    this.path = path;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public toJSON(): DriveItemAttributes {
    return {
      uuid: this.uuid,
      path: this.path,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
