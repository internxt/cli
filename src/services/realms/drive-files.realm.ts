import Realm, { ObjectSchema } from 'realm';

export class DriveFileRealmSchema extends Realm.Object<DriveFileRealmSchema> {
  id!: number;
  name!: string;
  type?: string;
  uuid!: string;
  fileId!: string;
  folder_id!: number;
  folder_uuid!: string;
  bucket!: string;
  relative_path!: string;
  created_at!: Date;
  updated_at!: Date;
  size!: number;
  status!: 'EXISTS' | 'REMOVED' | 'TRASHED';
  static readonly schema: ObjectSchema = {
    name: 'DriveFile',
    properties: {
      id: 'int',
      name: 'string',
      type: 'string?',
      uuid: { type: 'string', indexed: true },
      file_id: 'string',
      folder_id: 'int',
      folder_uuid: 'string',
      bucket: 'string',
      relative_path: { type: 'string', indexed: true },
      created_at: 'date',
      updated_at: 'date',
      size: 'int',
      status: 'string',
    },
    primaryKey: 'id',
  };
}

export class DriveFilesRealm {
  constructor(private realm: Realm) {}

  async getByRelativePath(relativePath: string): Promise<DriveFileRealmSchema | null> {
    const object = this.realm
      .objects<DriveFileRealmSchema>('DriveFile')
      .filtered('relative_path = $0', relativePath)
      .find((file) => file.relative_path === relativePath);

    return object ?? null;
  }
}
