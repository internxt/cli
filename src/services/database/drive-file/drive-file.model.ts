import { DriveFileAttributes } from './drive-file.attributes';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('drive_file')
export class DriveFileModel implements DriveFileAttributes {
  @PrimaryColumn({ nullable: false, type: 'varchar' })
  declare uuid: string;

  @Column({ nullable: false, type: 'varchar' })
  declare name: string;

  @Column({ nullable: true, type: 'varchar' })
  declare type: string;

  @Column({ nullable: false, type: 'varchar' })
  declare fileId: string;

  @Column({ nullable: false, type: 'varchar' })
  declare folderUuid: string;

  @Column({ nullable: false, type: 'varchar' })
  declare bucket: string;

  @Column({ nullable: false, type: 'varchar' })
  declare createdAt: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare updatedAt: Date;

  @Column({ nullable: false, type: 'bigint' })
  declare size: number;

  @Column({ nullable: false, type: 'varchar' })
  declare status: 'EXISTS' | 'TRASHED' | 'DELETED';

  @Column({ nullable: false, type: 'varchar' })
  declare creationTime: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare modificationTime: Date;
}

export default DriveFileModel;
