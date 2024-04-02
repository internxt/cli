import Realm, { ObjectSchema } from 'realm';
import { DriveFolderItem } from '../../types/drive.types';

export class DriveFolderRealmSchema extends Realm.Object<DriveFolderRealmSchema> {
  id!: number;
  name!: string;
  uuid!: string;
  relative_path!: string;
  parent_id?: number;
  created_at!: Date;
  updated_at!: Date;
  status!: 'EXISTS' | 'REMOVED' | 'TRASHED';
  static readonly schema: ObjectSchema = {
    name: 'DriveFolder',
    properties: {
      id: 'int',
      name: 'string',
      uuid: { type: 'string', indexed: true },
      relative_path: { type: 'string', indexed: true },
      parent_id: { type: 'int', indexed: true, default: -1 },
      created_at: 'date',
      updated_at: 'date',
      status: 'string',
    },
    primaryKey: 'id',
  };
}

export class DriveFoldersRealm {
  constructor(private realm: Realm) {}

  findByRelativePath(relativePath: string): DriveFolderRealmSchema | null {
    const object = this.realm
      .objects<DriveFolderRealmSchema>('DriveFolder')
      .filtered('relative_path = $0', relativePath)
      .find((folder) => folder.relative_path === relativePath);

    return object ?? null;
  }

  findByParentId(parentId: number | null): DriveFolderRealmSchema | null {
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
