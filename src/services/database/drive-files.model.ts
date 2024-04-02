import { DriveFileItem } from '../../types/drive.types';

export class DriveFileModelSchema {
  id!: number;
  name!: string;
  type?: string;
  uuid!: string;
  file_id!: string;
  folder_id!: number;
  bucket!: string;
  relative_path!: string;
  created_at!: Date;
  updated_at!: Date;
  size!: number;
  status!: 'EXISTS' | 'REMOVED' | 'TRASHED';
}

export class DriveFilesModel {
  constructor() {}

  findByRelativePath(relativePath: string): DriveFileModelSchema | null {
    const object = this.realm
      .objects<DriveFileRealmSchema>('DriveFile')
      .filtered('relative_path = $0', relativePath)
      .find((file) => file.relative_path === relativePath);

    return object ?? null;
  }

  createOrReplace(driveFile: DriveFileItem, relativePath: string) {
    const existingObject = this.realm.objectForPrimaryKey<DriveFileRealmSchema>('DriveFile', driveFile.id);

    this.realm.write(() => {
      if (existingObject) {
        this.realm.delete(existingObject);
      }

      this.realm.create<DriveFileRealmSchema>('DriveFile', {
        id: driveFile.id,
        name: driveFile.name,
        type: driveFile.type,
        uuid: driveFile.uuid,
        file_id: driveFile.fileId,
        folder_id: driveFile.folderId,
        bucket: driveFile.bucket,
        relative_path: relativePath,
        created_at: driveFile.createdAt,
        updated_at: driveFile.updatedAt,
        size: driveFile.size,
        status: 'EXISTS',
      });
    });
  }
}
