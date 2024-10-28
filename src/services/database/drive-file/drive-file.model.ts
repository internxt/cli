import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { DriveFileAttributes } from './drive-file.attributes';

@Table({
  underscored: true,
  tableName: 'files',
})
export class DriveFileModel extends Model implements DriveFileAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Index
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull
  @Column(DataType.STRING(24))
  declare type?: string;

  @Unique
  @Column(DataType.UUIDV4)
  declare uuid: string;

  @Column(DataType.STRING(24))
  declare fileId: string;

  @Column(DataType.INTEGER)
  declare folderId: number;

  @Column(DataType.UUIDV4)
  declare folderUuid: string;

  @Column(DataType.STRING(24))
  declare bucket: string;

  @Column(DataType.TEXT)
  declare relativePath: string;

  @Column(DataType.BIGINT)
  declare size: number;

  @Column(DataType.STRING)
  declare status: string;

  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare updatedAt: Date;
}

export default DriveFileModel;
