import { DriveFileItem } from '../../../types/drive.types';
import { DriveFileAttributes } from './drive-file.attributes';

export class DriveFile implements DriveFileAttributes {
  id: number;
  name: string;
  type?: string;
  uuid: string;
  fileId: string;
  folderId: number;
  folderUuid: string;
  bucket: string;
  relativePath: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
  creationTime: Date;
  modificationTime: Date;

  constructor({
    id,
    name,
    type,
    uuid,
    fileId,
    folderId,
    folderUuid,
    bucket,
    relativePath,
    createdAt,
    updatedAt,
    size,
    status,
    creationTime,
    modificationTime,
  }: DriveFileAttributes) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.uuid = uuid;
    this.fileId = fileId;
    this.folderId = folderId;
    this.folderUuid = folderUuid;
    this.bucket = bucket;
    this.relativePath = relativePath;
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
      id: this.id,
      name: this.name,
      type: this.type,
      uuid: this.uuid,
      fileId: this.fileId,
      folderId: this.folderId,
      folderUuid: this.folderUuid,
      bucket: this.bucket,
      relativePath: this.relativePath,
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
      id: this.id,
      name: this.name,
      type: this.type,
      uuid: this.uuid,
      fileId: this.fileId,
      folderId: this.folderId,
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
