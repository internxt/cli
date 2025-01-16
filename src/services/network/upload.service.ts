import { Readable } from 'node:stream';
import axios from 'axios';
import { UploadOptions } from '../../types/network.types';
import { NetworkFacade } from './network-facade.service';

export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  public uploadFileToNetwork = async (
    url: string,
    from: Readable | Buffer,
    options: UploadOptions,
  ): Promise<{ etag: string }> => {
    const response = await axios.put(url, from, {
      signal: options.abortController?.signal,
      onUploadProgress: (progressEvent) => {
        if (options.progressCallback && progressEvent.loaded) {
          options.progressCallback(progressEvent.loaded);
        }
      },
    });

    const etag = response.headers['etag'];
    if (!etag) {
      throw new Error('Missing Etag in response when uploading file');
    }
    return { etag };
  };

  public uploadFileStream = async (
    fileStream: Readable,
    userBucket: string,
    userMnemonic: string,
    fileSize: number,
    networkFacade: NetworkFacade,
    progressCallback?: (progress: number) => void,
  ) => {
    const minimumMultipartThreshold = 100 * 1024 * 1024;
    const useMultipart = fileSize > minimumMultipartThreshold;
    const partSize = 30 * 1024 * 1024;
    const parts = Math.ceil(fileSize / partSize);

    let uploadOperation: Promise<
      [
        Promise<{
          fileId: string;
          hash: Buffer;
        }>,
        AbortController,
      ]
    >;

    if (useMultipart) {
      uploadOperation = networkFacade.uploadMultipartFromStream(userBucket, userMnemonic, fileSize, fileStream, {
        parts,
        progressCallback,
      });
    } else {
      uploadOperation = networkFacade.uploadFromStream(userBucket, userMnemonic, fileSize, fileStream, {
        progressCallback,
      });
    }

    const uploadFileOperation = await uploadOperation;

    return uploadFileOperation;
  };
}
