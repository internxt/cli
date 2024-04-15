import { DriveFolderItem } from '../../../types/drive.types';
import { DriveFolderAttributes } from './drive-folder.attributes';
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

  deleteById = (id: DriveFolder['id']): Promise<number> => {
    return DriveFolderModel.destroy({ where: { id } });
  };

  createFolder = async (driveFolderItem: DriveFolderItem, relativePath: string): Promise<DriveFolder> => {
    const driveFolder: DriveFolder = DriveFolder.build({
      ...driveFolderItem,
      relativePath,
    });
    const newFolder = await DriveFolderModel.create({ ...driveFolder.toJSON() });
    return this.toDomain(newFolder);
  };

  updateFolder = async (
    id: number,
    driveFolderItemAttributes: Partial<Pick<DriveFolderAttributes, 'name' | 'relativePath' | 'status'>>,
  ): Promise<DriveFolder | null> => {
    const existingFolder = await DriveFolderModel.findByPk(id);
    if (!existingFolder) return null;

    existingFolder.updatedAt = new Date();
    existingFolder.status = driveFolderItemAttributes.status ?? existingFolder.status;
    existingFolder.name = driveFolderItemAttributes.name ?? existingFolder.name;
    existingFolder.relativePath = driveFolderItemAttributes.relativePath ?? existingFolder.relativePath;

    return existingFolder.save();
  };

  toDomain = (model: DriveFolderModel): DriveFolder => {
    const driveFolder = DriveFolder.build({
      ...model.toJSON(),
    });
    return driveFolder;
  };

  static readonly clean = (): Promise<void> => {
    return DriveFolderModel.truncate();
  };
}
