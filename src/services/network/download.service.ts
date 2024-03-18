import axios from 'axios';

export class DownloadService {
  static readonly instance = new DownloadService();

  async downloadFile(
    url: string,
    options: { progressCallback?: (progress: number) => void; abortController?: AbortController },
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await axios.get(url, {
      responseType: 'stream',
      onDownloadProgress(progressEvent) {
        if (options.progressCallback && progressEvent.total) {
          const reportedProgress = progressEvent.loaded / progressEvent.total;

          options.progressCallback(reportedProgress);
        }
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
