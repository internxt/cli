import { promises } from 'node:fs';
import { basename, dirname, join, relative, parse } from 'node:path';
import { FileSystemNode, ScanResult } from './local-filesystem.types';
import { logger } from '../../utils/logger.utils';

export class LocalFilesystemService {
  static readonly instance = new LocalFilesystemService();

  public scanLocalDirectory = async (path: string): Promise<ScanResult> => {
    const folders: FileSystemNode[] = [];
    const files: FileSystemNode[] = [];

    const parentPath = dirname(path);
    const totalBytes = await this.scanRecursive(path, parentPath, folders, files);
    return {
      folders,
      files,
      totalItems: folders.length + files.length,
      totalBytes,
    };
  };

  public scanRecursive = async (
    currentPath: string,
    parentPath: string,
    folders: FileSystemNode[],
    files: FileSystemNode[],
  ): Promise<number> => {
    try {
      const stats = await promises.stat(currentPath);
      const relativePath = relative(parentPath, currentPath);

      if (stats.isFile() && stats.size > 0) {
        const fileInfo = parse(currentPath);
        files.push({
          type: 'file',
          name: fileInfo.name,
          absolutePath: currentPath,
          relativePath,
          size: stats.size,
        });
        return stats.size;
      }

      if (stats.isDirectory()) {
        folders.push({
          type: 'folder',
          name: basename(currentPath),
          absolutePath: currentPath,
          relativePath,
          size: 0,
        });
        const entries = await promises.readdir(currentPath, { withFileTypes: true });
        const validEntries = entries.filter((e) => !e.isSymbolicLink());
        const bytesArray = await Promise.all(
          validEntries.map((e) => this.scanRecursive(join(currentPath, e.name), parentPath, folders, files)),
        );

        return bytesArray.reduce((sum, bytes) => sum + bytes, 0);
      }

      return 0;
    } catch (error: unknown) {
      logger.warn(`Error scanning path ${currentPath}: ${(error as Error).message} - skipping...`);
      return 0;
    }
  };
}
