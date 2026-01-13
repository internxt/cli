import { NetworkCredentials, SelfsignedCert } from '../types/network.types';
import { createHash, X509Certificate } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import selfsigned from 'selfsigned';
import parseRange from 'range-parser';
import { WebdavConfig } from '../types/command.types';
import { WEBDAV_SSL_CERTS_DIR } from '../constants/configs';

export class NetworkUtils {
  static getAuthFromCredentials(creds: NetworkCredentials): { username: string; password: string } {
    return {
      username: creds.user,
      password: createHash('SHA256').update(Buffer.from(creds.pass)).digest().toString('hex'),
    };
  }

  static readonly WEBDAV_SSL_CERTS_PATH = {
    cert: path.join(WEBDAV_SSL_CERTS_DIR, 'cert.crt'),
    privateKey: path.join(WEBDAV_SSL_CERTS_DIR, 'priv.key'),
  };

  static async generateNewSelfsignedCerts(configs: WebdavConfig): Promise<SelfsignedCert> {
    const newCerts = await this.generateSelfSignedSSLCerts(configs);
    this.saveWebdavSSLCerts(newCerts);
    return {
      cert: newCerts.cert,
      key: newCerts.private,
    };
  }

  static async getWebdavSSLCerts(configs: WebdavConfig) {
    const existCert = !!(await stat(this.WEBDAV_SSL_CERTS_PATH.cert).catch(() => false));
    const existKey = !!(await stat(this.WEBDAV_SSL_CERTS_PATH.privateKey).catch(() => false));
    if (!existCert || !existKey) {
      return this.generateNewSelfsignedCerts(configs);
    } else {
      let selfsignedCert: SelfsignedCert = {
        cert: await readFile(this.WEBDAV_SSL_CERTS_PATH.cert),
        key: await readFile(this.WEBDAV_SSL_CERTS_PATH.privateKey),
      };

      const { validTo } = new X509Certificate(selfsignedCert.cert);
      const dateToday = new Date();
      const dateValid = new Date(validTo);

      if (dateToday > dateValid) {
        const newCerts = await this.generateNewSelfsignedCerts(configs);
        selfsignedCert = {
          cert: newCerts.cert,
          key: newCerts.key,
        };
      }
      return selfsignedCert;
    }
  }

  static async saveWebdavSSLCerts(pems: selfsigned.GenerateResult) {
    await writeFile(this.WEBDAV_SSL_CERTS_PATH.cert, pems.cert, 'utf8');
    await writeFile(this.WEBDAV_SSL_CERTS_PATH.privateKey, pems.private, 'utf8');
  }

  static async generateSelfSignedSSLCerts(configs: WebdavConfig): Promise<selfsigned.GenerateResult> {
    const attrs = [{ name: 'commonName', value: configs.host }];
    const extension: selfsigned.SubjectAltNameExtension = {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2,
          value: configs.host,
        },
      ],
    };
    const extensions: selfsigned.CertificateExtension[] = [extension];
    const notAfterDate = new Date();
    notAfterDate.setDate(notAfterDate.getDate() + 365);
    const pems = await selfsigned.generate(attrs, { notAfterDate, algorithm: 'sha256', keySize: 2048, extensions });
    return pems;
  }

  static parseRangeHeader(rangeOptions: { range?: string; totalFileSize: number }): RangeOptions | undefined {
    if (!rangeOptions.range) {
      return;
    }
    const parsed = parseRange(rangeOptions.totalFileSize, rangeOptions.range);
    if (Array.isArray(parsed)) {
      if (parsed.length > 1) {
        throw new Error(`Multi Range-Requests functionality is not implemented. ${JSON.stringify(rangeOptions)}`);
      } else if (parsed.length <= 0) {
        throw new Error(`Empty Range-Request. ${JSON.stringify(rangeOptions)}`);
      }

      if (parsed.type === 'bytes') {
        const rangeSize = parsed[0].end - parsed[0].start + 1;
        return {
          range: rangeOptions.range,
          rangeSize: rangeSize,
          totalFileSize: rangeOptions.totalFileSize,
          parsed: parsed[0],
        };
      } else {
        throw new Error(`Unkwnown Range-Request type "${parsed.type}". ${JSON.stringify(rangeOptions)}`);
      }
    } else if (parsed === -1) {
      throw new Error(`Malformed Range-Request. ${JSON.stringify(rangeOptions)}`);
    } else if (parsed === -2) {
      throw new Error(`Unsatisfiable Range-Request. ${JSON.stringify(rangeOptions)}`);
    } else {
      throw new Error(`Unknown error from Range-Request. ${JSON.stringify(rangeOptions)}`);
    }
  }
}

export interface RangeOptions {
  range: string;
  rangeSize: number;
  totalFileSize: number;
  parsed: parseRange.Range;
}
