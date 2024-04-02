import { Readable } from 'node:stream';
import { UploadOptions } from '../../types/network.types';

import fetch from 'node-fetch';
export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  async uploadFile(url: string, from: Readable, options: UploadOptions): Promise<{ etag: string }> {
    const response = await fetch(url, { method: 'PUT', body: from, signal: options.abortController?.signal });

    const etag = response.headers.get('etag');
    options.progressCallback(1);
    if (!etag) {
      throw new Error('Missing Etag in response when uploading file');
    }
    return { etag };
  }
}
