import Rudderstack from '@rudderstack/rudder-sdk-node';
import { ConfigService } from './config.service';
import packageJSON from '../../package.json';

export const AnalyticsEvents = {
  CLILogin: 'CLI Login',
  WebDAVEnabled: 'WebDAV Enabled',
  WebDAVRequest: 'WebDAV Request',
};

export class AnalyticsService {
  public static readonly instance: AnalyticsService = new AnalyticsService(ConfigService.instance);

  constructor(private config: ConfigService) {}

  private getRudderstack() {
    return new Rudderstack(this.config.get('RUDDERSTACK_WRITE_KEY'), {
      dataPlaneUrl: this.config.get('RUDDERSTACK_DATAPLANE_URL'),
    });
  }

  track(
    eventKey: keyof typeof AnalyticsEvents,
    options: { app: 'internxt-cli' | 'internxt-webdav'; userId: string },
    params: object = {},
  ) {
    return new Promise<void>((resolve) => {
      const rudderstack = this.getRudderstack();
      rudderstack.track(
        {
          event: AnalyticsEvents[eventKey],
          userId: options.userId,
          properties: {
            app: {
              name: options.app,
              version: packageJSON.version,
            },
            ...params,
          },
        },
        () => {
          resolve();
        },
      );
    });
  }
}
