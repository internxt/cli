import { Readable } from 'stream';
import { vi } from 'vitest';
import { FileSystemNode } from '../../../../src/services/local-filesystem/local-filesystem.types';

export function createFileSystemNodeFixture({
  type,
  name,
  relativePath,
  size = 0,
  absolutePath = `/absolute/${relativePath}`,
}: {
  type: 'file' | 'folder';
  name: string;
  relativePath: string;
  size?: number;
  absolutePath?: string;
}) {
  return { type, name, relativePath, size, absolutePath } as FileSystemNode;
}

export function createProgressFixtures() {
  return {
    currentProgress: { itemsUploaded: 0, bytesUploaded: 0 },
    emitProgress: vi.fn(),
  };
}

export function createMockStats(size: number) {
  return {
    size,
    birthtime: new Date('2024-01-01'),
    mtime: new Date('2024-01-02'),
  };
}

export function createMockReadStream() {
  const stream = new Readable();
  stream.push(null);
  return stream;
}

export function createMockTimer() {
  return {
    stop: vi.fn().mockReturnValue(1000),
  };
}
