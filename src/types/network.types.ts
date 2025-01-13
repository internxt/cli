export interface NetworkCredentials {
  user: string;
  pass: string;
}

export type DownloadProgressCallback = (downloadedBytes: number) => void;
export type UploadProgressCallback = (uploadedBytes: number) => void;
export interface NetworkOperationBaseOptions {
  progressCallback: UploadProgressCallback;
  abortController?: AbortController;
}

export type UploadOptions = NetworkOperationBaseOptions;
export type DownloadOptions = NetworkOperationBaseOptions;

export interface SelfsignedCert {
  cert: string | Buffer;
  key: string | Buffer;
}
