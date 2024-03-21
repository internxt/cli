import axios from 'axios';
import superagent from 'superagent';
import { UploadOptions } from '../../types/network.types';
import { CryptoService } from '../crypto.service';

export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  async uploadFile(url: string, data: Blob, options: UploadOptions): Promise<{ etag: string }> {
    const request = superagent
      .put(url)
      .set('Content-Length', data.size.toString())
      .set('Content-Type', data.type)
      .send(Buffer.from(await data.arrayBuffer()))
      .on('progress', (progressEvent) => {
        if (options.progressCallback && progressEvent.total) {
          const reportedProgress = progressEvent.loaded / parseInt(progressEvent.total);
          options.progressCallback(reportedProgress);
        }
      });

    options.abortController?.signal.addEventListener('abort', () => {
      request.abort();
    });

    const response = await request;

    const etag = response.headers.etag;
    options.progressCallback(1);
    if (!etag) {
      throw new Error('Missing Etag in response when uploading file');
    }
    return { etag };
  }

  async uploadReadableStream(
    url: string,
    size: number,
    data: ReadableStream<Uint8Array>,
    options: UploadOptions,
  ): Promise<{ etag: string; hash: Buffer }> {
    const [dataReadableHash, dataReadableRequest] = data.tee();

    const request = axios.put(url, dataReadableRequest, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': size.toString(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
      onUploadProgress: (progressEvent) => {
        console.info({ progressEvent });
        if (options.progressCallback && progressEvent.total) {
          const reportedProgress = progressEvent.loaded / progressEvent.total;
          options.progressCallback(reportedProgress);
        }
      },
      signal: options.abortController?.signal,
      cancelToken: new axios.CancelToken((canceler) => {
        options.abortController?.signal.addEventListener('abort', () => {
          canceler();
        });
      }),
    });

    const getFileHash = CryptoService.instance.readableToHash(dataReadableHash);

    const [response, hash] = await Promise.all([request, getFileHash]);

    const etag = response.headers.etag;
    options.progressCallback(1);
    if (!etag) {
      throw new Error('Missing Etag in response when uploading file');
    }
    return { etag, hash };
  }
}
