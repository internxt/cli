import { DriveFileItem } from '../../../types/drive.types';
import { DriveFileModel } from './drive-file.model';
import { DriveFile } from './drive-file.domain';

export class DriveFileRepository {
  findByRelativePath = async (relativePath: DriveFile['relativePath']): Promise<DriveFile | null> => {
    const file = await DriveFileModel.findOne({
      where: {
        relativePath,
      },
    });
    return file ? this.toDomain(file) : null;
  };

  findById = async (id: DriveFile['id']): Promise<DriveFile | null> => {
    const file = await DriveFileModel.findByPk(id);
    return file ? this.toDomain(file) : null;
  };

  deleteById = async (id: DriveFile['id']): Promise<void> => {
    await DriveFileModel.destroy({ where: { id } });
  };

  createFile = async (driveFileItem: DriveFileItem, relativePath: string): Promise<DriveFile> => {
    const driveFile: DriveFile = DriveFile.build({
      ...driveFileItem,
      relativePath,
    });
    const newFile = await DriveFileModel.create({ ...driveFile.toJSON() });
    return this.toDomain(newFile);
  };

  toDomain = (model: DriveFileModel): DriveFile => {
    const driveFile = DriveFile.build({
      ...model.toJSON(),
    });
    return driveFile;
  };

  static readonly clean = (): Promise<void> => {
    return DriveFileModel.drop();
  };
}
