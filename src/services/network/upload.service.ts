import superagent from 'superagent';
import { UploadOptions } from '../../types/network.types';
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
}
