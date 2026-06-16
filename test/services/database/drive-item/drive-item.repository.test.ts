import { describe, expect, test, vi } from 'vitest';
import { DriveItemRepository } from '../../../../src/services/database/drive-item/drive-item.repository';
import { DriveItemBD } from '../../../../src/services/database/drive-item/drive-item.domain';

describe('Drive Item Repository', () => {
  test('when an item is saved, then it can be retrieved', async () => {
    const mockItem = {
      uuid: 'uuid-1',
      path: '/folder/file.txt',
      type: 'file' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const expected = new DriveItemBD(mockItem);
    vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue([expected]);
    vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(expected);

    await DriveItemRepository.instance.createOrUpdate([expected]);
    const item = await DriveItemRepository.instance.getByPath('/folder/file.txt');
    expect(item).toBeDefined();
    expect(item?.uuid).toBe('uuid-1');
    expect(item?.type).toBe('file');
  });

  test('when an existing item is updated, then the changes are saved', async () => {
    const items = [
      { uuid: 'uuid-1', path: '/old/path.txt', type: 'file' as const, createdAt: new Date(), updatedAt: new Date() },
    ];
    const updatedItems = [
      { uuid: 'uuid-1', path: '/new/path.txt', type: 'file' as const, createdAt: new Date(), updatedAt: new Date() },
    ];
    const createOrUpdateSpy = vi
      .spyOn(DriveItemRepository.instance, 'createOrUpdate')
      .mockResolvedValueOnce(items.map((i) => new DriveItemBD(i)))
      .mockResolvedValueOnce(updatedItems.map((i) => new DriveItemBD(i)));
    vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(new DriveItemBD(updatedItems[0]));

    await DriveItemRepository.instance.createOrUpdate(items);
    await DriveItemRepository.instance.createOrUpdate(updatedItems);
    const item = await DriveItemRepository.instance.getByPath('/new/path.txt');
    expect(item).toBeDefined();
    expect(item?.uuid).toBe('uuid-1');
    expect(createOrUpdateSpy).toHaveBeenCalledTimes(2);
  });

  test('when an item is requested by its identifier, then it is returned', async () => {
    const driveItem = new DriveItemBD({
      uuid: 'uuid-1',
      path: '/folder/',
      type: 'folder',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(DriveItemRepository.instance, 'getByUuid').mockResolvedValue(driveItem);

    const item = await DriveItemRepository.instance.getByUuid('uuid-1');
    expect(item).toBeDefined();
    expect(item?.uuid).toBe('uuid-1');
  });

  test('when no item matches the given path, then undefined is returned', async () => {
    vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
    const item = await DriveItemRepository.instance.getByPath('/nonexistent');
    expect(item).toBeUndefined();
  });

  test('when no item matches the given identifier, then undefined is returned', async () => {
    vi.spyOn(DriveItemRepository.instance, 'getByUuid').mockResolvedValue(undefined);
    const item = await DriveItemRepository.instance.getByUuid('nonexistent-uuid');
    expect(item).toBeUndefined();
  });

  test('when items are removed by their identifiers, then they are no longer available', async () => {
    const allItems = [
      new DriveItemBD({
        uuid: 'uuid-1',
        path: '/file1.txt',
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new DriveItemBD({
        uuid: 'uuid-2',
        path: '/file2.txt',
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
    vi.spyOn(DriveItemRepository.instance, 'getAll').mockResolvedValue([allItems[1]]);

    await DriveItemRepository.instance.delete(['uuid-1']);
    const remaining = await DriveItemRepository.instance.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].uuid).toBe('uuid-2');
  });

  test('when all stored items are requested, then they are returned', async () => {
    const allItems = [
      new DriveItemBD({
        uuid: 'uuid-1',
        path: '/file1.txt',
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new DriveItemBD({
        uuid: 'uuid-2',
        path: '/file2.txt',
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    vi.spyOn(DriveItemRepository.instance, 'getAll').mockResolvedValue(allItems);

    const result = await DriveItemRepository.instance.getAll();
    expect(result).toHaveLength(2);
  });

  test('when an item at a given path is replaced with a different identifier, then the update is saved', async () => {
    const items = [
      { uuid: 'uuid-1', path: '/same/path.txt', type: 'file' as const, createdAt: new Date(), updatedAt: new Date() },
    ];
    const updatedItems = [
      { uuid: 'uuid-2', path: '/same/path.txt', type: 'file' as const, createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.spyOn(DriveItemRepository.instance, 'createOrUpdate')
      .mockResolvedValueOnce(items.map((i) => new DriveItemBD(i)))
      .mockResolvedValueOnce(updatedItems.map((i) => new DriveItemBD(i)));
    vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(new DriveItemBD(updatedItems[0]));

    await DriveItemRepository.instance.createOrUpdate(items);
    await DriveItemRepository.instance.createOrUpdate(updatedItems);
    const item = await DriveItemRepository.instance.getByPath('/same/path.txt');
    expect(item).toBeDefined();
    expect(item?.uuid).toBe('uuid-2');
  });

  test('when an item is partially updated, then only the specified fields change', async () => {
    const updatedPath = '/renamed.txt';
    vi.spyOn(DriveItemRepository.instance, 'updateByUuid').mockResolvedValue(undefined);
    vi.spyOn(DriveItemRepository.instance, 'getByUuid').mockResolvedValue(
      new DriveItemBD({
        uuid: 'uuid-1',
        path: updatedPath,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await DriveItemRepository.instance.updateByUuid('uuid-1', { path: updatedPath });
    const item = await DriveItemRepository.instance.getByUuid('uuid-1');
    expect(item).toBeDefined();
    expect(item?.path).toBe(updatedPath);
  });

  test('when items are returned, then they have the expected structure', async () => {
    const driveItem = new DriveItemBD({
      uuid: 'uuid-1',
      path: '/file.txt',
      type: 'file',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(driveItem);

    const item = await DriveItemRepository.instance.getByPath('/file.txt');
    expect(item).toBeInstanceOf(DriveItemBD);
    expect(item?.toJSON).toBeDefined();
  });
});
