import axios from 'axios';
import { UploadOptions } from '../../types/network.types';

const MAX_UPLOAD_PROGRESS = 90;
export class UploadService {
  public static readonly instance: UploadService = new UploadService();

  async uploadFile(url: string, data: Blob, options: UploadOptions): Promise<{ etag: string }> {
    const response = await axios.put(
      url,
      {
        data,
        headers: {
          'content-type': 'application/octet-stream',
        },
      },
      {
        onUploadProgress: (progressEvent) => {
          if (options.progressCallback && progressEvent.total) {
            const reportedProgress = (progressEvent.loaded / progressEvent.total) * MAX_UPLOAD_PROGRESS;
            options.progressCallback(reportedProgress);
          }
        },
        cancelToken: new axios.CancelToken((canceler) => {
          options.abortController?.signal.addEventListener('abort', () => {
            canceler();
          });
        }),
      },
    );

    options.progressCallback(100);
    if (!response.headers.etag) {
      throw new Error('Missing Etag in response when uploading file');
    }
    return { etag: response.headers.etag };
  }
}
