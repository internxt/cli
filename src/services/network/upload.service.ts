import { Readable } from 'node:stream';
import axios from 'axios';
import { UploadOptions } from '../../types/network.types';

export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  async uploadFile(url: string, size: number, from: Readable, options: UploadOptions): Promise<{ etag: string }> {
    const response = await axios.put(url, from, {
      signal: options.abortController?.signal,
      onUploadProgress: (progressEvent) => {
        if (options.progressCallback && progressEvent.loaded) {
          const reportedProgress = Math.round((progressEvent.loaded / size) * 100);
          options.progressCallback(reportedProgress);
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
