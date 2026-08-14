import { NetworkFacade } from '../services/network/network-facade.service';

export interface NetworkCredentials {
  user: string;
  pass: string;
}

export interface NetworkOptions {
  networkFacade: NetworkFacade;
  bucket: string;
  mnemonic: string;
}

export type DownloadProgressCallback = (downloadedBytes: number) => void;
type UploadProgressCallback = (uploadedBytes: number) => void;
interface NetworkOperationBaseOptions {
  progressCallback?: UploadProgressCallback;
  abortController?: AbortController;
}

export type DownloadOptions = NetworkOperationBaseOptions;

export interface SelfsignedCert {
  cert: string | Buffer;
  key: string | Buffer;
}
