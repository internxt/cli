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
