import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DriveFolderAttributes } from './drive-folder.attributes';

@Entity('drive_file')
export class DriveFolderModel implements DriveFolderAttributes {
  @PrimaryColumn({ nullable: false, type: 'varchar' })
  declare uuid: string;

  @Column({ nullable: false, type: 'varchar' })
  declare name: string;

  @Column({ nullable: false, type: 'varchar' })
  declare status: 'EXISTS' | 'TRASHED';

  @Column({ nullable: false, type: 'varchar' })
  declare parentUuid: string | null;

  @Column({ nullable: false, type: 'varchar' })
  declare createdAt: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare updatedAt: Date;
}

export default DriveFolderModel;
