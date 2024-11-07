import { ConfigService } from './config.service';

export const AnalyticsEvents = {
  CLILogin: 'CLI Login',
  WebDAVEnabled: 'WebDAV Enabled',
  WebDAVRequest: 'WebDAV Request',
};

export class AnalyticsService {
  public static readonly instance: AnalyticsService = new AnalyticsService(ConfigService.instance);

  constructor(private readonly config: ConfigService) {}

  async track(
    eventKey: keyof typeof AnalyticsEvents,
    options: { app: 'internxt-cli' | 'internxt-webdav'; userId: string },
    params: object = {},
  ) {
    return { eventKey, options, params };
  }
}
