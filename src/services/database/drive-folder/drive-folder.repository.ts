import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveFolder } from './drive-folder.domain';
import { DriveFolderModel } from './drive-folder.model';

const BATCH_SIZE = 100;

export class FolderRepository {
  public static readonly instance = new FolderRepository();

  private folderRepository = DatabaseService.instance.dataSource.getRepository(DriveFolderModel);

  public createOrUpdate = async (files: DriveFolderModel[]) => {
    if (files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const chunk = files.slice(i, i + BATCH_SIZE);

        await this.folderRepository.upsert(chunk, { conflictPaths: ['uuid'] });
      }

      return files.map((file) => DriveFolder.build(file));
    } catch (error) {
      ErrorUtils.report(error, { files });
    }
  };

  public updateByUuid = async (uuid: string, update: Partial<DriveFolderModel>) => {
    try {
      return await this.folderRepository.update({ uuid }, update);
    } catch (error) {
      ErrorUtils.report(error, { uuid });
    }
  };

  public delete = async (uuids: string[]) => {
    try {
      return await this.folderRepository.delete(uuids);
    } catch (error) {
      ErrorUtils.report(error, { uuids });
    }
  };
}
