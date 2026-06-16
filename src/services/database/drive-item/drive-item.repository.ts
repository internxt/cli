import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveItem } from './drive-item.domain';
import { DriveItemModel } from './drive-item.model';

export class DriveItemRepository {
  public static readonly instance = new DriveItemRepository();

  private readonly repository = DatabaseService.instance.dataSource.getRepository(DriveItemModel);

  public createOrUpdate = async (items: DriveItemModel[]): Promise<DriveItem[] | undefined> => {
    try {
      const uuids = items.map((i) => i.uuid);
      const paths = items.map((i) => i.path);

      const existing = await this.repository
        .createQueryBuilder('item')
        .where('item.uuid IN (:...uuids)', { uuids })
        .orWhere('item.path IN (:...paths)', { paths })
        .getMany();

      const existingByUuid = new Map(existing.map((e) => [e.uuid, e]));
      const existingByPath = new Map(existing.map((e) => [e.path, e]));

      for (const item of items) {
        const match = existingByUuid.get(item.uuid) ?? existingByPath.get(item.path);
        if (match) {
          await this.repository.update(match.uuid, item);
        } else {
          await this.repository.insert(item);
        }
      }

      return items.map((item) => new DriveItem(item));
    } catch (error) {
      ErrorUtils.report(error, { createOrUpdate: items });
    }
  };

  public updateByUuid = async (uuid: string, update: Partial<DriveItemModel>) => {
    try {
      return await this.repository.update({ uuid }, update);
    } catch (error) {
      ErrorUtils.report(error, { updateByUuid: uuid });
    }
  };

  public delete = async (uuids: string[]) => {
    try {
      return await this.repository.delete(uuids);
    } catch (error) {
      ErrorUtils.report(error, { delete: uuids });
    }
  };

  public getByUuid = async (uuid: string): Promise<DriveItem | undefined> => {
    try {
      const item = await this.repository.findOneBy({ uuid });
      if (!item) {
        return;
      }
      return new DriveItem(item);
    } catch (error) {
      ErrorUtils.report(error, { getByUuid: uuid });
    }
  };

  public getByPath = async (path: string): Promise<DriveItem | undefined> => {
    try {
      const item = await this.repository.findOneBy({ path });
      if (!item) {
        return;
      }
      return new DriveItem(item);
    } catch (error) {
      ErrorUtils.report(error, { getByPath: path });
    }
  };

  public getAll = async (): Promise<DriveItem[]> => {
    try {
      const items = await this.repository.find();
      return items.map((item) => new DriveItem(item));
    } catch (error) {
      ErrorUtils.report(error, { getAll: true });
      return [];
    }
  };
}
