import { describe, expect, test, vi } from 'vitest';
import { randomBytes, randomInt, X509Certificate } from 'node:crypto';
import selfsigned, { GenerateResult } from 'selfsigned';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { NetworkUtils } from '../../src/utils/network.utils';
import { Stats } from 'node:fs';
import { fail } from 'node:assert';
import { WebdavConfig } from '../../src/types/command.types';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';

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
  test('when obtaining authentication credentials, then the password is returned as a hash', async () => {
    const result = NetworkUtils.getAuthFromCredentials({
      user: 'test',
      pass: 'password123!',
    });

    expect(result.password).to.be.equal('5751a44782594819e4cb8aa27c2c9d87a420af82bc6a5a05bc7f19c3bb00452b');
  });

  test('when SSL certificates do not exist, then they are self-signed and saved', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();

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
    const selfsignedSpy = vi.spyOn(selfsigned, 'generate').mockResolvedValue(sslSelfSigned);

    const result = await NetworkUtils.getWebdavSSLCerts(webdavConfig);

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(selfsignedSpy).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  // We will need to find a way to mock the X509Certificate successfully
  test.skip('when SSL certificates exist, then they are read from storage', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();
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
    mock509Certificate.mockImplementation(() => ({
      validTo: future.toDateString(),
    }));

    const result = await NetworkUtils.getWebdavSSLCerts(webdavConfig);

    expect(result).to.deep.equal({ cert: sslMock.cert, key: sslMock.private });
    expect(mock509Certificate).toHaveBeenCalledOnce();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  // We will need to find a way to mock the X509Certificate successfully
  test.skip('when SSL certificates exist but are expired, then new ones are generated and saved', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();
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
    mock509Certificate.mockImplementation(() => ({
      validTo: past.toDateString(),
    }));

    const selfsignedSpy = vi.spyOn(selfsigned, 'generate').mockResolvedValue(sslSelfSigned);

    const result = await NetworkUtils.getWebdavSSLCerts(webdavConfig);

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(selfsignedSpy).toHaveBeenCalledOnce();
    expect(mock509Certificate).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  test('when a valid range header is provided, then it is parsed successfully', () => {
    const mockSize = randomInt(500, 10000);
    const rangeStart = randomInt(0, 450);
    const range = `bytes=${rangeStart}-${mockSize}`;

    const result = NetworkUtils.parseRangeHeader({ range, totalFileSize: mockSize });

    expect(result).to.deep.equal({
      range,
      rangeSize: mockSize - rangeStart,
      totalFileSize: mockSize,
      parsed: { start: rangeStart, end: mockSize - 1 },
    });
  });

  test('when an invalid range header is provided, then an error is returned', () => {
    const totalFileSize = randomInt(500, 10000);

    expect(NetworkUtils.parseRangeHeader({ range: undefined, totalFileSize })).to.be.equal(undefined);

    try {
      NetworkUtils.parseRangeHeader({ range: 'range', totalFileSize });
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('Unsatisfiable Range-Request.');
    }

    try {
      NetworkUtils.parseRangeHeader({ range: 'whatever-range', totalFileSize });
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('Unsatisfiable Range-Request.');
    }

    try {
      NetworkUtils.parseRangeHeader({ range: 'bytes=', totalFileSize });
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('Malformed Range-Request.');
    }

    try {
      NetworkUtils.parseRangeHeader({ range: 'megabytes=50-55', totalFileSize });
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('Unkwnown Range-Request type ');
    }

    try {
      NetworkUtils.parseRangeHeader({ range: 'bytes=50-55,0-10,5-10,56-60', totalFileSize });
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('Multi Range-Requests functionality is not implemented.');
    }
  });
});
