export interface NetworkCredentials {
  user: string;
  pass: string;
}

export type UploadProgressCallback = (progress: number) => void;
export interface NetworkOperationBaseOptions {
  progressCallback: UploadProgressCallback;
  abortController?: AbortController;
}

export type UploadOptions = NetworkOperationBaseOptions;
