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
  static schema: ObjectSchema = {
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

  async findByRelativePath(relativePath: string): Promise<DriveFolderRealmSchema | null> {
    const object = this.realm
      .objects<DriveFolderRealmSchema>('DriveFolder')
      .filtered('relative_path = $0', relativePath)
      .find((folder) => folder.relative_path === relativePath);

    return object ?? null;
  }

  async findByParentId(parentId: number | null): Promise<DriveFolderRealmSchema | null> {
    // -1 is root as we cannot index null fields
    const parentFolder = this.realm.objectForPrimaryKey<DriveFolderRealmSchema>('DriveFolder', parentId ?? -1);

    return parentFolder;
  }

  async create(driveFolder: DriveFolderItem, relativePath: string) {
    const exists = this.realm.objectForPrimaryKey<DriveFolderRealmSchema>('DriveFolder', driveFolder.id);

    this.realm.write(() => {
      if (exists) {
        this.realm.delete(exists);
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

    return;
  }
}
