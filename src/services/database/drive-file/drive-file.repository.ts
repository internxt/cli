import { IsNull } from 'typeorm';
import { DatabaseUtils } from '../../../utils/database.utils';
import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveFile } from './drive-file.domain';
import { DriveFileModel } from './drive-file.model';

export class FileRepository {
  public static readonly instance = new FileRepository();

  private fileRepository = DatabaseService.instance.dataSource.getRepository(DriveFileModel);

  public createOrUpdate = async (files: DriveFileModel[]): Promise<DriveFile[] | undefined> => {
    try {
      for (let i = 0; i < files.length; i += DatabaseUtils.CREATE_BATCH_SIZE) {
        const chunk = files.slice(i, i + DatabaseUtils.CREATE_BATCH_SIZE);

        await this.fileRepository.upsert(chunk, { conflictPaths: ['uuid'] });
      }

      return files.map((file) => DriveFile.build(file));
    } catch (error) {
      ErrorUtils.report(error, { createOrUpdate: files });
    }
  };

  public updateByUuid = async (uuid: string, update: Partial<DriveFileModel>) => {
    try {
      return await this.fileRepository.update({ uuid }, update);
    } catch (error) {
      ErrorUtils.report(error, { updateByUuid: uuid });
    }
  };

  public delete = async (uuids: string[]) => {
    try {
      return await this.fileRepository.delete(uuids);
    } catch (error) {
      ErrorUtils.report(error, { delete: uuids });
    }
  };

  public deleteByParentUuid = async (parentUuid: string) => {
    try {
      return await this.fileRepository.delete({ folderUuid: parentUuid });
    } catch (error) {
      ErrorUtils.report(error, { deleteByParentUuid: parentUuid });
    }
  };

  public getByParentUuidNameAndType = async (
    parentUuid: string,
    name: string,
    type: string | null,
  ): Promise<DriveFile | undefined> => {
    try {
      const typeCondition = type ?? IsNull();
      const file = await this.fileRepository.findOneBy({ folderUuid: parentUuid, name, type: typeCondition });
      if (!file) {
        return;
      }
      return DriveFile.build(file);
    } catch (error) {
      ErrorUtils.report(error, { getByParentuuidAndName: { parentUuid, name, type } });
    }
  };
}
