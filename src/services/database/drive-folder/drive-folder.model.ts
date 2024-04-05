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
import { DriveFolderAttributes } from './drive-folder.attributes';

@Table({
  underscored: true,
  tableName: 'folders',
})
export class DriveFolderModel extends Model implements DriveFolderAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Index
  @Column(DataType.STRING)
  declare name: string;

  @Unique
  @Column(DataType.UUIDV4)
  declare uuid: string;

  @Column(DataType.TEXT)
  declare relativePath: string;

  @AllowNull
  @Column(DataType.INTEGER)
  declare parentId: number | null;

  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare updatedAt: Date;
}

export default DriveFolderModel;
