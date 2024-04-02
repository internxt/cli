import { createHash, Hash } from 'crypto';
import { Transform, TransformCallback, TransformOptions } from 'stream';

export class HashStream extends Transform {
  hasher: Hash;
  finalHash: Buffer;

  constructor(opts?: TransformOptions) {
    super(opts);
    this.hasher = createHash('sha256');
    this.finalHash = Buffer.alloc(0);
  }

  _transform(chunk: Buffer, enc: BufferEncoding, cb: TransformCallback) {
    this.hasher.update(chunk);
    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    return this.hasher.end(cb);
  }

  reset() {
    this.hasher = createHash('sha256');
  }

  readHash() {
    if (!this.finalHash.length) {
      this.finalHash = this.hasher.read();
    }

    return this.finalHash;
  }

  getHash() {
    if (!this.finalHash.length) {
      this.readHash();
    }

    return createHash('ripemd160').update(this.finalHash).digest();
  }
}
