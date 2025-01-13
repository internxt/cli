import { Readable } from 'node:stream';
import axios from 'axios';
import { UploadOptions } from '../../types/network.types';

export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  async uploadFile(url: string, from: Readable | Buffer, options: UploadOptions): Promise<{ etag: string }> {
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
  }
}
