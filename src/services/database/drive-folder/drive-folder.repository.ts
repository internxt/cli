import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveFolder } from './drive-folder.domain';
import { DriveFolderModel } from './drive-folder.model';
import { DatabaseUtils } from '../../../utils/database.utils';

export class FolderRepository {
  public static readonly instance = new FolderRepository();

  private folderRepository = DatabaseService.instance.dataSource.getRepository(DriveFolderModel);

  public getByUuid = async (uuid: string): Promise<DriveFolder | undefined> => {
    try {
      const folder = await this.folderRepository.findOneBy({ uuid });
      if (!folder) {
        return;
      }
      return DriveFolder.build(folder);
    } catch (error) {
      ErrorUtils.report(error, { getByUuid: uuid });
    }
  };

  public getAllByParentUuid = async (parentUuid?: string): Promise<DriveFolder[] | undefined> => {
    try {
      const folders = await this.folderRepository.findBy({ parentUuid });
      if (!folders) {
        return;
      }
      return folders.map((folder) => DriveFolder.build(folder));
    } catch (error) {
      ErrorUtils.report(error, { getAllByParentUuid: parentUuid });
    }
  };

  public getByParentUuidAndName = async (parentUuid: string, name: string): Promise<DriveFolder | undefined> => {
    try {
      const folder = await this.folderRepository.findOneBy({ parentUuid, name });
      if (!folder) {
        return;
      }
      return DriveFolder.build(folder);
    } catch (error) {
      ErrorUtils.report(error, { getByParentuuidAndName: { parentUuid, name } });
    }
  };

  public getByPath = async (path: string, parentUuid: string): Promise<DriveFolder | undefined> => {
    try {
      const onFound = async (uuid: string) => {
        const folder = await this.folderRepository.findOneBy({ uuid });
        if (!folder) {
          return;
        }
        return DriveFolder.build(folder);
      };

      return DatabaseUtils.getFolderByPathGeneric({
        path,
        parentUuid,
        onFound,
        getByParentAndName: this.getByParentUuidAndName.bind(this),
      });
    } catch (error) {
      ErrorUtils.report(error, { getByPath: path });
    }
  };

  public createOrUpdate = async (files: DriveFolderModel[]) => {
    if (files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i += DatabaseUtils.CREATE_BATCH_SIZE) {
        const chunk = files.slice(i, i + DatabaseUtils.CREATE_BATCH_SIZE);

        await this.folderRepository.upsert(chunk, { conflictPaths: ['uuid'] });
      }

      return files.map((file) => DriveFolder.build(file));
    } catch (error) {
      ErrorUtils.report(error, { createOrUpdate: files });
    }
  };

  public updateByUuid = async (uuid: string, update: Partial<DriveFolderModel>) => {
    try {
      return await this.folderRepository.update({ uuid }, update);
    } catch (error) {
      ErrorUtils.report(error, { updateByUuid: uuid });
    }
  };

  public delete = async (uuids: string[]) => {
    try {
      return await this.folderRepository.delete(uuids);
    } catch (error) {
      ErrorUtils.report(error, { delete: uuids });
    }
  };
}
