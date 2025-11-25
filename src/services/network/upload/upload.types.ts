import { LoginUserDetails } from '../../../types/command.types';
import { FileSystemNode } from '../../local-filesystem/local-filesystem.types';
import { NetworkFacade } from '../network-facade.service';

export interface UploadResult {
  totalBytes: number;
  rootFolderId: string;
  uploadTimeMs: number;
}

export interface UploadFolderHandlerParams {
  localPath: string;
  destinationFolderUuid: string;
  loginUserDetails: LoginUserDetails;
  jsonFlag?: boolean;
  onProgress: (progress: UploadProgress) => void;
}

export type UploadFolderHandlerResult = { data: UploadResult; error?: undefined } | { error: Error; data?: undefined };

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
  folderMap: Map<string, string>;
  network: NetworkFacade;
  bucket: string;
  destinationFolderUuid: string;
}
