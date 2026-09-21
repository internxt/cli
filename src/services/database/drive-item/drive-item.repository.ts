import { In } from 'typeorm';
import { ErrorUtils } from '../../../utils/errors.utils';
import { DatabaseService } from '../database.service';
import { DriveItemBD } from './drive-item.domain';
import { DriveItemModel } from './drive-item.model';
import { DriveItemAttributes } from './drive-item.attributes';

export class DriveItemRepository {
  public static readonly instance = new DriveItemRepository();

  private readonly repository = DatabaseService.instance.dataSource.getRepository(DriveItemModel);

  public createOrUpdate = async (items: DriveItemModel[]): Promise<DriveItemBD[] | undefined> => {
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

      const itemsToInsert: DriveItemModel[] = [];
      const itemsToUpdate: { targetUuid: string; item: DriveItemModel }[] = [];

      for (const item of items) {
        const match = existingByUuid.get(item.uuid) ?? existingByPath.get(item.path);
        if (match) {
          itemsToUpdate.push({ targetUuid: match.uuid, item });
        } else {
          itemsToInsert.push(item);
        }
      }

      await this.repository.manager.transaction(async (transactionalEntityManager) => {
        if (itemsToInsert.length > 0) {
          await transactionalEntityManager.insert(DriveItemModel, itemsToInsert);
        }
        for (const { targetUuid, item } of itemsToUpdate) {
          await transactionalEntityManager.update(DriveItemModel, targetUuid, item);
        }
      });

      return items.map((item) => new DriveItemBD(item));
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

  public getByUuid = async (uuid: string): Promise<DriveItemBD | undefined> => {
    try {
      const item = await this.repository.findOneBy({ uuid });
      if (!item) {
        return;
      }
      return new DriveItemBD(item);
    } catch (error) {
      ErrorUtils.report(error, { getByUuid: uuid });
    }
  };

  public getByPath = async (path: string, type?: DriveItemAttributes['type']): Promise<DriveItemBD | undefined> => {
    try {
      const variant = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
      const paths = variant.length > 0 ? [path, variant] : [path];

      const candidates = await this.repository.findBy(type ? { path: In(paths), type } : { path: In(paths) });
      if (candidates.length === 0) {
        return;
      }

      const rank = (item: DriveItemModel) => (item.path === path ? 0 : 2) + (item.type === 'file' ? 0 : 1);
      const [best] = candidates.sort((a, b) => rank(a) - rank(b));
      return new DriveItemBD(best);
    } catch (error) {
      ErrorUtils.report(error, { getByPath: path, type });
    }
  };

  public getAll = async (): Promise<DriveItemBD[]> => {
    try {
      const items = await this.repository.find();
      return items.map((item) => new DriveItemBD(item));
    } catch (error) {
      ErrorUtils.report(error, { getAll: true });
      return [];
    }
  };
}
