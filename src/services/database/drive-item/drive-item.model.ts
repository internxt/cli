import { DriveItemAttributes } from './drive-item.attributes';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('drive_item')
export class DriveItemModel implements DriveItemAttributes {
  @PrimaryColumn({ nullable: false, type: 'varchar' })
  declare uuid: string;

  @Column({ nullable: false, type: 'varchar' })
  declare path: string;

  @Column({ nullable: false, type: 'varchar' })
  declare type: 'file' | 'folder';

  @Column({ nullable: false, type: 'varchar' })
  declare createdAt: Date;

  @Column({ nullable: false, type: 'varchar' })
  declare updatedAt: Date;
}
