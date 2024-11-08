import { NetworkCredentials, SelfsignedCert } from '../types/network.types';
import { createHash, X509Certificate } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

  static getWebdavSSLCerts() {
    if (!existsSync(this.WEBDAV_SSL_CERTS_PATH.cert) || !existsSync(this.WEBDAV_SSL_CERTS_PATH.privateKey)) {
      return this.generateNewSelfsignedCerts();
    } else {
      let selfsignedCert: SelfsignedCert = {
        cert: readFileSync(this.WEBDAV_SSL_CERTS_PATH.cert),
        key: readFileSync(this.WEBDAV_SSL_CERTS_PATH.privateKey),
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

  static saveWebdavSSLCerts(pems: selfsigned.GenerateResult): void {
    writeFileSync(this.WEBDAV_SSL_CERTS_PATH.cert, pems.cert, 'utf8');
    writeFileSync(this.WEBDAV_SSL_CERTS_PATH.privateKey, pems.private, 'utf8');
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
