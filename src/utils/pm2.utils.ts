import path from 'node:path';
import pm2 from 'pm2';

export type WebDavProcessStatus =
  | 'online'
  | 'stopping'
  | 'stopped'
  | 'launching'
  | 'errored'
  | 'one-launch-status'
  | 'offline'
  | 'unknown';

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

  static disconnect() {
    pm2.disconnect();
  }

  // TODO: Use this once the issue with PM2 is resolved: https://github.com/Unitech/pm2/issues/4825
  static async clean() {
    const list = await this.list();
    if (list.length === 0) {
      // There are NOT other active processes. PM2 daemon can be killed.
      return new Promise<void>((resolve, reject) => {
        pm2.killDaemon((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  static list(): Promise<pm2.ProcessDescription[]> {
    return new Promise((resolve, reject) => {
      pm2.list((err, processes) => {
        if (err) {
          reject(err);
        } else {
          // There are active processes. PM2 daemon will not be killed.
          resolve(processes);
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
          resolve({
            status: 'offline',
          });
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
