export interface FileSystemNode {
  type: 'file' | 'folder';
  name: string;
  size: number;
  absolutePath: string;
  relativePath: string;
}

export interface ScanResult {
  folders: FileSystemNode[];
  files: FileSystemNode[];
  totalItems: number;
  totalBytes: number;
}
