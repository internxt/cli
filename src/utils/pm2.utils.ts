import path from 'node:path';
import pm2 from 'pm2';

export type WebDavProcessStatus = 'online' | 'unknown' | 'errored';
export class PM2Utils {
  private static WEBDAV_APP_NAME = 'Internxt CLI WebDav';
  static connect() {
    return new Promise<void>((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static killWebDavServer() {
    return new Promise<void>((resolve) => {
      pm2.delete(this.WEBDAV_APP_NAME, () => {
        resolve();
      });
    });
  }

  static webdavServerStatus(): Promise<{ status: WebDavProcessStatus }> {
    return new Promise((resolve, reject) => {
      pm2.describe(this.WEBDAV_APP_NAME, (err, processDescription) => {
        if (err) {
          reject(err);
        } else if (processDescription.length === 0) {
          reject(new Error('WebDav server is not running'));
        } else {
          const process = processDescription[0];
          resolve({
            status: (process.pm2_env?.status ?? 'unknown') as WebDavProcessStatus,
          });
        }
      });
    });
  }

  static startWebDavServer() {
    return new Promise<void>((resolve, reject) => {
      pm2.start(
        {
          wait_ready: true,
          script: path.join(__dirname, '../webdav/index.js'),
          name: this.WEBDAV_APP_NAME,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }
}
