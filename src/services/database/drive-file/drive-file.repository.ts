import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveFile } from './drive-file.domain';
import DriveFileModel from './drive-file.model';

const BATCH_SIZE = 100;

export class FileRepository {
  public static readonly instance = new FileRepository();

  private fileRepository = DatabaseService.instance.dataSource.getRepository(DriveFileModel);

  public createOrUpdate = async (files: DriveFileModel[]) => {
    if (files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const chunk = files.slice(i, i + BATCH_SIZE);

        await this.fileRepository.upsert(chunk, { conflictPaths: ['uuid'] });
      }

      return files.map((file) => DriveFile.build(file));
    } catch (error) {
      ErrorUtils.report(error, { files });
    }
  };

  public delete = async (uuids: string[]) => {
    try {
      return await this.fileRepository.delete(uuids);
    } catch (error) {
      ErrorUtils.report(error, { uuids });
    }
  };
}
