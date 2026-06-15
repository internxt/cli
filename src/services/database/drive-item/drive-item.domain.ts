import { DriveItemAttributes } from './drive-item.attributes';

export class DriveItem implements DriveItemAttributes {
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

  static build(item: DriveItemAttributes): DriveItem {
    return new DriveItem(item);
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
