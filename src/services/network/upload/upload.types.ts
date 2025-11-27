import { LoginUserDetails } from '../../../types/command.types';
import { FileSystemNode } from '../../local-filesystem/local-filesystem.types';
import { NetworkFacade } from '../network-facade.service';

export interface UploadResult {
  totalBytes: number;
  rootFolderId: string;
  uploadTimeMs: number;
}

export interface UploadFolderParams {
  localPath: string;
  destinationFolderUuid: string;
  loginUserDetails: LoginUserDetails;
  jsonFlag?: boolean;
  onProgress: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  percentage: number;
  currentFile?: string;
}

export interface CreateFoldersParams {
  foldersToCreate: FileSystemNode[];
  destinationFolderUuid: string;
  currentProgress: { itemsUploaded: number; bytesUploaded: number };
  emitProgress: () => void;
}

export interface CreateFolderWithRetryParams {
  folderName: string;
  parentFolderUuid: string;
}

export interface UploadFilesInBatchesParams {
  network: NetworkFacade;
  filesToUpload: FileSystemNode[];
  folderMap: Map<string, string>;
  bucket: string;
  destinationFolderUuid: string;
  currentProgress: { itemsUploaded: number; bytesUploaded: number };
  emitProgress: () => void;
}

export interface UploadFileWithRetryParams {
  file: FileSystemNode;
  network: NetworkFacade;
  bucket: string;
  parentFolderUuid: string;
}
export const MAX_CONCURRENT_UPLOADS = 5;
export const DELAYS_MS = [500, 1000, 2000];
export const MAX_RETRIES = 2;
