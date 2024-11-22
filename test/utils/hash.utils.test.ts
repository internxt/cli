import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HashStream } from '../../src/utils/hash.utils';

describe('Hash Utils', () => {
  let hashStream: HashStream;

  beforeEach(() => {
    hashStream = new HashStream();
    vi.restoreAllMocks();
  });

  it('should update the hasher with data chunk on _transform call', async () => {
    const spy = vi.spyOn(hashStream.hasher, 'update');
    const chunk = Buffer.from('Test data');

    await new Promise<void>((resolve) => {
      hashStream._transform(chunk, 'utf8', () => {
        expect(spy).toHaveBeenCalledOnce();
        resolve();
      });
    });
  });

  it('should successfully calculate hash on readHash call', async () => {
    const testData = 'Some test data';
    await new Promise<void>((resolve) => {
      hashStream.on('data', () => {});
      hashStream.on('end', () => {
        const readHash = hashStream.readHash();
        expect(readHash).toBeInstanceOf(Buffer);
        expect(readHash.length).toBeGreaterThan(0);
        resolve();
      });
      hashStream.write(testData);
      hashStream.end();
    });
  });
});
