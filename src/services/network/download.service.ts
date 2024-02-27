import superagent from 'superagent';

export class DownloadService {
  static readonly instance = new DownloadService();

  async downloadFile(
    url: string,
    options: { progressCallback?: (progress: number) => void; abortController?: AbortController },
  ): Promise<ReadableStream<Uint8Array>> {
    const request = superagent.get(url).on('progress', (progressEvent) => {
      console.log('PROGRESS', progressEvent);
      if (options.progressCallback && progressEvent.total) {
        const reportedProgress = progressEvent.loaded / parseInt(progressEvent.total);

        options.progressCallback(reportedProgress);
      }
    });

    const response = await request;

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        response.on('data', (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        });
        response.on('end', () => {
          controller.close();
        });
      },
    });
    return readable;
  }
}
