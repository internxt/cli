import { DriveFileItem } from '../../../types/drive.types';
import { DriveFileAttributes } from './drive-file.attributes';

export class DriveFile implements DriveFileAttributes {
  name: string;
  type?: string;
  uuid: string;
  fileId: string;
  folderUuid: string;
  bucket: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
  creationTime: Date;
  modificationTime: Date;

  constructor({
    name,
    type,
    uuid,
    fileId,
    folderUuid,
    bucket,
    createdAt,
    updatedAt,
    size,
    status,
    creationTime,
    modificationTime,
  }: DriveFileAttributes) {
    this.name = name;
    this.type = type;
    this.uuid = uuid;
    this.fileId = fileId;
    this.folderUuid = folderUuid;
    this.bucket = bucket;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.size = size;
    this.status = status;
    this.creationTime = creationTime;
    this.modificationTime = modificationTime;
  }

  static build(file: DriveFileAttributes): DriveFile {
    return new DriveFile(file);
  }

  public toJSON(): DriveFileAttributes {
    return {
      name: this.name,
      type: this.type,
      uuid: this.uuid,
      fileId: this.fileId,
      folderUuid: this.folderUuid,
      bucket: this.bucket,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      size: this.size,
      status: this.status,
      creationTime: this.creationTime,
      modificationTime: this.modificationTime,
    };
  }

  public toItem(): DriveFileItem {
    return {
      itemType: 'file',
      name: this.name,
      type: this.type,
      uuid: this.uuid,
      fileId: this.fileId,
      folderUuid: this.folderUuid,
      bucket: this.bucket,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      size: this.size,
      status: this.status,
      creationTime: this.creationTime,
      modificationTime: this.modificationTime,
    };
  }
}
