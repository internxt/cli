import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes, X509Certificate } from 'node:crypto';
import selfsigned, { GenerateResult } from 'selfsigned';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { NetworkUtils } from '../../src/utils/network.utils';
import { Stats } from 'node:fs';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...(actual as object),
    readFile: vi.fn().mockImplementation(actual.readFile),
    writeFile: vi.fn().mockImplementation(actual.writeFile),
    stat: vi.fn().mockImplementation(actual.stat),
  };
});
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockStat = vi.mocked(stat);

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...(actual as object),
    X509Certificate: vi.fn().mockImplementation((_) => new actual.X509Certificate(_)),
  };
});
const mock509Certificate = vi.mocked(X509Certificate);

describe('Network utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When obtaining auth credentials, should return the password as a SHA256 hash', async () => {
    const result = NetworkUtils.getAuthFromCredentials({
      user: 'test',
      pass: 'password123!',
    });

    expect(result.password).to.be.equal('5751a44782594819e4cb8aa27c2c9d87a420af82bc6a5a05bc7f19c3bb00452b');
  });

  it('When webdav ssl certs do not exist, then they should be self signed and saved to files', async () => {
    const sslSelfSigned: GenerateResult = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };

    mockReadFile.mockImplementation(() => {
      throw new Error();
    });
    mockWriteFile.mockImplementation(async () => {});
    mockStat.mockImplementation(async () => {
      return Promise.reject();
    });
    const selfsignedSpy = vi.spyOn(selfsigned, 'generate').mockImplementation(() => sslSelfSigned);

    const result = await NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(selfsignedSpy).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('When webdav ssl certs exist, then they are read from the files', async () => {
    const sslMock = {
      private: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
    };

    mockReadFile
      .mockImplementationOnce(async () => {
        return Promise.resolve(sslMock.cert);
      })
      .mockImplementationOnce(async () => {
        return Promise.resolve(sslMock.private);
      });
    mockWriteFile.mockImplementation(() => {
      throw new Error();
    });
    mockStat.mockImplementation(async () => {
      return Promise.resolve({} as Stats);
    });

    const future = new Date();
    future.setDate(future.getDate() + 1);
    // @ts-expect-error - We stub the stat method partially
    mock509Certificate.mockImplementation(() => ({
      validTo: future.toDateString(),
    }));

    const result = await NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslMock.cert, key: sslMock.private });
    expect(mock509Certificate).toHaveBeenCalledOnce();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it('When webdav ssl certs exist but they are expired, then they are generated and saved to files', async () => {
    const sslSelfSigned: GenerateResult = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };
    const sslMock = {
      private: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
    };

    mockReadFile
      .mockImplementationOnce(async () => {
        return Promise.resolve(sslMock.cert);
      })
      .mockImplementationOnce(async () => {
        return Promise.resolve(sslMock.private);
      });
    mockWriteFile.mockImplementation(async () => {});
    mockStat.mockImplementation(async () => {
      return Promise.resolve({} as Stats);
    });

    const past = new Date();
    past.setDate(past.getDate() - 1);
    // @ts-expect-error - We stub the stat method partially
    mock509Certificate.mockImplementation(() => ({
      validTo: past.toDateString(),
    }));

    const selfsignedSpy = vi.spyOn(selfsigned, 'generate').mockImplementation(() => sslSelfSigned);

    const result = await NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(selfsignedSpy).toHaveBeenCalledOnce();
    expect(mock509Certificate).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });
});
