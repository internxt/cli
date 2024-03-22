export interface NetworkCredentials {
  user: string;
  pass: string;
}

export type ProgressCallback = (progress: number) => void;
export interface NetworkOperationBaseOptions {
  progressCallback: ProgressCallback;
  abortController?: AbortController;
}

export type UploadOptions = NetworkOperationBaseOptions;
export type DownloadOptions = NetworkOperationBaseOptions;

export interface UploadMultipartOptions {
  uploadingCallback: ProgressCallback;
  abortController?: AbortController;
  continueUploadOptions?: {
    taskId: string;
    isPaused: boolean;
  };
  parts: number;
}

export interface UploadTask {
  contentToUpload: Blob;
  urlToUpload: string;
  index: number;
}
