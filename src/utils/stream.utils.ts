import { Request } from 'express';
import { ReadStream, WriteStream } from 'fs';

export class StreamUtils {
  static readStreamToReadableStream(readStream: ReadStream): ReadableStream<Uint8Array> {
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        readStream.on('data', (chunk) => {
          controller.enqueue(Buffer.from(chunk));
        });

        readStream.on('end', () => {
          controller.close();
        });
      },
    });
    return readable;
  }

  static writeStreamToWritableStream(writeStream: WriteStream): WritableStream<Uint8Array> {
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        writeStream.write(chunk);
      },
    });
    return writable;
  }

  static joinReadableBinaryStreams(streams: ReadableStream<Uint8Array>[]): ReadableStream<Uint8Array> {
    const streamsCopy = streams.map((s) => s);
    let keepReading = true;

    const flush = () => streamsCopy.forEach((s) => s.cancel());

    const stream = new ReadableStream({
      async pull(controller) {
        if (!keepReading) return flush();

        const downStream = streamsCopy.shift();

        if (!downStream) {
          return controller.close();
        }

        const reader = downStream.getReader();
        let done = false;

        while (!done && keepReading) {
          const status = await reader.read();

          if (!status.done) {
            controller.enqueue(status.value);
          }

          done = status.done;
        }

        reader.releaseLock();
      },
      cancel() {
        keepReading = false;
      },
    });

    return stream;
  }

  static requestToReadableStream(request: Request): ReadableStream<Uint8Array> {
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        request.on('data', (chunk) => {
          controller.enqueue(Buffer.from(chunk));
        });

        request.on('end', () => {
          controller.close();
        });
      },
    });
    return readable;
  }

  static mergeBuffers(buffer1: Uint8Array, buffer2: Uint8Array): Uint8Array {
    const mergedBuffer = new Uint8Array(buffer1.length + buffer2.length);
    mergedBuffer.set(buffer1);
    mergedBuffer.set(buffer2, buffer1.length);
    return mergedBuffer;
  }

  /**
   * Given a stream, it will read it and enqueue its parts in chunkSizes
   * @param readable Readable stream
   * @param chunkSize The chunkSize in bytes that we want each chunk to be
   * @returns A readable whose output is chunks of the file of size chunkSize
   */
  static streamReadableIntoChunks(readable: ReadableStream<Uint8Array>, chunkSize: number): ReadableStream<Uint8Array> {
    const reader = readable.getReader();
    let buffer = new Uint8Array(0);

    return new ReadableStream({
      async pull(controller) {
        function handleDone() {
          if (buffer.byteLength > 0) {
            controller.enqueue(buffer);
          }
          return controller.close();
        }

        const status = await reader.read();

        if (status.done) return handleDone();

        const chunk = status.value;
        buffer = StreamUtils.mergeBuffers(buffer, chunk);

        while (buffer.byteLength < chunkSize) {
          const status = await reader.read();

          if (status.done) return handleDone();

          buffer = StreamUtils.mergeBuffers(buffer, status.value);
        }

        controller.enqueue(buffer.slice(0, chunkSize));
        buffer = new Uint8Array(buffer.slice(chunkSize));
      },
    });
  }
}
