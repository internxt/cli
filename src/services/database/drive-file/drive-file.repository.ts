import { DriveFileItem } from '../../../types/drive.types';
import { DriveFileModel } from './drive-file.model';
import { DriveFile } from './drive-file.domain';
import { DriveFileAttributes } from './drive-file.attributes';

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

  deleteById = (id: DriveFile['id']): Promise<number> => {
    return DriveFileModel.destroy({ where: { id } });
  };

  createFile = async (driveFileItem: DriveFileItem, relativePath: string): Promise<DriveFile> => {
    const driveFile: DriveFile = DriveFile.build({
      ...driveFileItem,
      relativePath,
    });
    const newFile = await DriveFileModel.create({ ...driveFile.toJSON() });
    return this.toDomain(newFile);
  };

  updateFile = async (
    id: number,
    driveFileItemAttributes: Partial<Pick<DriveFileAttributes, 'status' | 'name' | 'relativePath'>>,
  ): Promise<DriveFile | null> => {
    const existingFile = await DriveFileModel.findByPk(id);
    if (!existingFile) return null;

    existingFile.updatedAt = new Date();
    existingFile.status = driveFileItemAttributes.status ?? existingFile.status;
    existingFile.name = driveFileItemAttributes.name ?? existingFile.name;
    existingFile.relativePath = driveFileItemAttributes.relativePath ?? existingFile.relativePath;

    return existingFile.save();
  };

  toDomain = (model: DriveFileModel): DriveFile => {
    const driveFile = DriveFile.build({
      ...model.toJSON(),
    });
    return driveFile;
  };

  static readonly clean = (): Promise<void> => {
    return DriveFileModel.truncate();
  };
}
