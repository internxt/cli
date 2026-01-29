import { beforeEach, describe, expect, it, vi, MockedFunction } from 'vitest';
import { LocalFilesystemService } from '../../../src/services/local-filesystem/local-filesystem.service';
import { Dirent, promises, Stats } from 'node:fs';
import { logger } from '../../../src/utils/logger.utils';
import { FileSystemNode } from '../../../src/services/local-filesystem/local-filesystem.types';

vi.mock('node:fs', () => ({
  promises: {
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

describe('Local Filesystem Service', () => {
  let service: LocalFilesystemService;
  const mockStat = vi.mocked(promises.stat);
  const mockReaddir = vi.mocked(promises.readdir) as unknown as MockedFunction<() => Promise<Dirent<string>[]>>;

  const createMockStats = (isFile: boolean, size: number): Stats =>
    ({
      isFile: () => isFile,
      isDirectory: () => !isFile,
      size,
    }) as Stats;

  const createMockDirent = (name: string, isSymlink = false) =>
    ({
      name,
      isSymbolicLink: () => isSymlink,
      isFile: () => false,
      isDirectory: () => false,
    }) as unknown as Dirent<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = LocalFilesystemService.instance;
    mockReaddir.mockResolvedValue([]);
  });

  describe('scanRecursive', () => {
    it('should handle a single file', async () => {
      mockStat.mockResolvedValue(createMockStats(true, 100));

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      const bytes = await service.scanRecursive('/path/file.txt', '/path', folders, files);

      expect(bytes).toBe(100);
      expect(files).toHaveLength(1);
      expect(folders).toHaveLength(0);
    });

    it('should handle an empty directory', async () => {
      mockStat.mockResolvedValue(createMockStats(false, 0));
      mockReaddir.mockResolvedValue([]);

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      const bytes = await service.scanRecursive('/path/folder', '/path', folders, files);

      expect(bytes).toBe(0);
      expect(folders).toHaveLength(1);
      expect(folders[0]).toMatchObject({
        type: 'folder',
        name: 'folder',
      });
      expect(files).toHaveLength(0);
    });

    it('should handle a directory with files', async () => {
      mockStat
        .mockResolvedValueOnce(createMockStats(false, 0))
        .mockResolvedValueOnce(createMockStats(true, 50))
        .mockResolvedValueOnce(createMockStats(true, 75));

      mockReaddir.mockResolvedValueOnce([createMockDirent('file1.txt', false), createMockDirent('file2.txt', false)]);

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      const bytes = await service.scanRecursive('/path/folder', '/path', folders, files);

      expect(bytes).toBe(125);
      expect(folders).toHaveLength(1);
      expect(files).toHaveLength(2);
    });

    it('should skip symbolic links', async () => {
      mockStat.mockResolvedValueOnce(createMockStats(false, 0)).mockResolvedValueOnce(createMockStats(true, 100));
      mockReaddir.mockResolvedValueOnce([createMockDirent('symlink', true), createMockDirent('file.txt', false)]);

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      await service.scanRecursive('/path/folder', '/path', folders, files);

      expect(mockStat).toHaveBeenCalledTimes(2);
      expect(files).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      mockStat.mockRejectedValue(new Error('Permission denied'));

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      const bytes = await service.scanRecursive('/path/forbidden', '/path', folders, files);

      expect(bytes).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
    });

    it('should handle nested directories', async () => {
      mockStat
        .mockResolvedValueOnce(createMockStats(false, 0))
        .mockResolvedValueOnce(createMockStats(false, 0))
        .mockResolvedValueOnce(createMockStats(true, 200));

      const subfolder = [createMockDirent('subfolder', false)];
      const file = [createMockDirent('file.txt', false)];

      mockReaddir.mockResolvedValueOnce(subfolder).mockResolvedValueOnce(file);

      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      const bytes = await service.scanRecursive('/path/folder', '/path', folders, files);

      expect(bytes).toBe(200);
      expect(folders).toHaveLength(2);
      expect(files).toHaveLength(1);
    });
    it('should properly skip empty files', async () => {
      mockStat
        .mockResolvedValueOnce(createMockStats(false, 0))
        .mockResolvedValueOnce(createMockStats(true, 0))
        .mockResolvedValueOnce(createMockStats(true, 200));
      const folders: FileSystemNode[] = [];
      const files: FileSystemNode[] = [];
      mockReaddir.mockResolvedValueOnce([createMockDirent('file1.txt', false), createMockDirent('file2.txt', false)]);
      const bytes = await service.scanRecursive('/path/folder', '/path', folders, files);

      expect(bytes).toBe(200);
      expect(folders).toHaveLength(1);
      expect(files).toHaveLength(1);
    });
  });
  describe('scanLocalDirectory', () => {
    it('should scan a directory and return complete results', async () => {
      mockStat.mockResolvedValueOnce(createMockStats(false, 0)).mockResolvedValueOnce(createMockStats(true, 100));

      mockReaddir.mockResolvedValueOnce([createMockDirent('file.txt', false)]);

      const result = await service.scanLocalDirectory('/test/folder');

      expect(result).toMatchObject({
        totalItems: 2,
        totalBytes: 100,
      });
      expect(result.folders).toHaveLength(1);
      expect(result.files).toHaveLength(1);
    });
  });
});
