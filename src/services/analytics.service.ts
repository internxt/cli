import { apiObject } from '@rudderstack/rudder-sdk-node';
import { ConfigService } from './config.service';
//import packageJSON from '../../package.json';
//import os from 'os';

export const AnalyticsEvents = {
  CLILogin: 'CLI Login',
  WebDAVEnabled: 'WebDAV Enabled',
  WebDAVRequest: 'WebDAV Request',
};

export class AnalyticsService {
  public static readonly instance: AnalyticsService = new AnalyticsService(ConfigService.instance);

  constructor(private config: ConfigService) {}

  /*private getRudderstack() {
    return new Rudderstack(this.config.get('RUDDERSTACK_WRITE_KEY'), {
      dataPlaneUrl: this.config.get('RUDDERSTACK_DATAPLANE_URL'),
    });
  }

  private platformShortName(platform: string) {
    switch (platform) {
      case 'darwin':
        return 'MAC';
      case 'win32':
        return 'WIN';
      case 'linux':
        return 'LINUX';
      default:
        return '';
    }
  }

  private platformFamily(platform: string) {
    switch (platform) {
      case 'darwin':
        return 'Mac';
      case 'win32':
        return 'Windows';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  }*/

  track(
    eventKey: keyof typeof AnalyticsEvents,
    options: { app: 'internxt-cli' | 'internxt-webdav'; userId: string },
    params: apiObject = {},
  ) {
    return;
  }
}
