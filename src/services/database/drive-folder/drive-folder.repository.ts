import { DriveFolderItem } from '../../../types/drive.types';
import { DriveFolder } from './drive-folder.domain';
import { DriveFolderModel } from './drive-folder.model';

export class DriveFolderRepository {
  findByRelativePath = async (relativePath: DriveFolder['relativePath']): Promise<DriveFolder | null> => {
    const folder = await DriveFolderModel.findOne({
      where: {
        relativePath,
      },
    });
    return folder ? this.toDomain(folder) : null;
  };

  findById = async (id: DriveFolder['id']): Promise<DriveFolder | null> => {
    const folder = await DriveFolderModel.findByPk(id);
    return folder ? this.toDomain(folder) : null;
  };

  deleteById = async (id: DriveFolder['id']): Promise<void> => {
    await DriveFolderModel.destroy({ where: { id } });
  };

  createFolder = async (driveFolderItem: DriveFolderItem, relativePath: string): Promise<DriveFolder> => {
    const driveFolder: DriveFolder = DriveFolder.build({
      ...driveFolderItem,
      relativePath,
    });
    const newFolder = await DriveFolderModel.create({ ...driveFolder.toJSON() });
    return this.toDomain(newFolder);
  };

  toDomain = (model: DriveFolderModel): DriveFolder => {
    const driveFolder = DriveFolder.build({
      ...model.toJSON(),
    });
    return driveFolder;
  };

  static readonly clean = (): Promise<void> => {
    return DriveFolderModel.drop();
  };
}
