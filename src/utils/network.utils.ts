import { NetworkCredentials, SelfsignedCert } from '../types/network.types';
import { createHash, X509Certificate } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import selfsigned from 'selfsigned';
import { ConfigService } from '../services/config.service';

export class NetworkUtils {
  static getAuthFromCredentials(creds: NetworkCredentials): { username: string; password: string } {
    return {
      username: creds.user,
      password: createHash('SHA256').update(Buffer.from(creds.pass)).digest().toString('hex'),
    };
  }

  static readonly WEBDAV_SSL_CERTS_PATH = {
    cert: path.join(ConfigService.WEBDAV_SSL_CERTS_DIR, 'cert.crt'),
    privateKey: path.join(ConfigService.WEBDAV_SSL_CERTS_DIR, 'priv.key'),
  };

  static generateNewSelfsignedCerts(): SelfsignedCert {
    const newCerts = this.generateSelfSignedSSLCerts();
    this.saveWebdavSSLCerts(newCerts);
    return {
      cert: newCerts.cert,
      key: newCerts.private,
    };
  }

  static async getWebdavSSLCerts() {
    const existCert = !!(await stat(this.WEBDAV_SSL_CERTS_PATH.cert).catch(() => false));
    const existKey = !!(await stat(this.WEBDAV_SSL_CERTS_PATH.privateKey).catch(() => false));
    if (!existCert || !existKey) {
      return this.generateNewSelfsignedCerts();
    } else {
      let selfsignedCert: SelfsignedCert = {
        cert: await readFile(this.WEBDAV_SSL_CERTS_PATH.cert),
        key: await readFile(this.WEBDAV_SSL_CERTS_PATH.privateKey),
      };

      const { validTo } = new X509Certificate(selfsignedCert.cert);
      const dateToday = new Date();
      const dateValid = new Date(validTo);

      if (dateToday > dateValid) {
        const newCerts = this.generateNewSelfsignedCerts();
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

  static generateSelfSignedSSLCerts(): selfsigned.GenerateResult {
    const attrs = [{ name: 'commonName', value: ConfigService.WEBDAV_LOCAL_URL }];
    const extensions = [
      {
        name: 'subjectAltName',
        altNames: [
          {
            type: 2,
            value: ConfigService.WEBDAV_LOCAL_URL,
          },
        ],
      },
    ];
    const pems = selfsigned.generate(attrs, { days: 365, algorithm: 'sha256', keySize: 2048, extensions });
    return pems;
  }
}
