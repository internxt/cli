import { ReadStream, WriteStream } from 'node:fs';
import { Transform, TransformCallback, TransformOptions } from 'node:stream';

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
}

export class BufferStream extends Transform {
  public buffer: Buffer | null;

  constructor(opts?: TransformOptions) {
    super(opts);
    this.buffer = null;
  }

  _transform(chunk: Buffer, _: BufferEncoding, callback: TransformCallback) {
    const currentBuffer = this.buffer ?? Buffer.alloc(0);
    this.buffer = Buffer.concat([currentBuffer, chunk]);
    callback(null, chunk);
  }

  _flush(callback: TransformCallback) {
    callback();
  }

  reset() {
    this.buffer = null;
  }

  getBuffer(): Buffer | null {
    return this.buffer;
  }
}
