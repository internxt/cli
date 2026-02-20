import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DriveFolderAttributes } from './drive-folder.attributes';

@Entity('drive_folder')
export class DriveFolderModel implements DriveFolderAttributes {
  @PrimaryColumn({ nullable: false, type: 'varchar' })
  declare uuid: string;

  @Column({ nullable: false, type: 'varchar' })
  declare name: string;

  @Column({ nullable: false, type: 'varchar' })
  declare status: 'EXISTS' | 'TRASHED';

  @Column({ nullable: true, type: 'varchar' })
  declare parentUuid: string | null;

  @Column({ nullable: false, type: 'varchar' })
  declare createdAt: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare updatedAt: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare creationTime: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare modificationTime: Date;
}
