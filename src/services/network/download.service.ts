import axios from 'axios';
import { DownloadProgressCallback } from '../../types/network.types';

export class DownloadService {
  static readonly instance = new DownloadService();

  async downloadFile(
    url: string,
    options: {
      progressCallback?: DownloadProgressCallback;
      abortController?: AbortController;
      rangeHeader?: string;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await axios.get(url, {
      responseType: 'stream',
      onDownloadProgress(progressEvent) {
        if (options.progressCallback && progressEvent.loaded) {
          options.progressCallback(progressEvent.loaded);
        }
      },
      headers: {
        range: options.rangeHeader,
      },
    });

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        response.data.on('data', (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        });
        response.data.on('end', () => {
          controller.close();
        });
      },
    });
    return readable;
  }
}
