import { DriveFolderItem } from '../../types/drive.types';

export class DriveFolderModelSchema {
  id!: number;
  name!: string;
  uuid!: string;
  relative_path!: string;
  parent_id?: number;
  created_at!: Date;
  updated_at!: Date;
  status!: 'EXISTS' | 'REMOVED' | 'TRASHED';
}

export class DriveFoldersModel {
  findByRelativePath(relativePath: string): DriveFolderModelSchema | null {
    const object = this.realm
      .objects<DriveFolderRealmSchema>('DriveFolder')
      .filtered('relative_path = $0', relativePath)
      .find((folder) => folder.relative_path === relativePath);

    return object ?? null;
  }

  findByParentId(parentId: number | null): DriveFolderModelSchema | null {
    // -1 is root as we cannot index null fields
    const parentFolder = this.realm.objectForPrimaryKey<DriveFolderRealmSchema>('DriveFolder', parentId ?? -1);

    return parentFolder;
  }

  createOrReplace(driveFolder: DriveFolderItem, relativePath: string) {
    const existingObject = this.realm.objectForPrimaryKey<DriveFolderRealmSchema>('DriveFolder', driveFolder.id);

    this.realm.write(() => {
      if (existingObject) {
        this.realm.delete(existingObject);
      }

      this.realm.create<DriveFolderRealmSchema>('DriveFolder', {
        id: driveFolder.id,
        name: driveFolder.name,
        uuid: driveFolder.uuid,
        parent_id: driveFolder.parentId ?? -1,
        created_at: driveFolder.createdAt,
        updated_at: driveFolder.updatedAt,
        status: 'EXISTS',
        relative_path: relativePath,
      });
    });
  }
}
