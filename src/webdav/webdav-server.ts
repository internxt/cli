import express from 'express';
import { ConfigService } from '../services/config.service';
import { OPTIONSRequestHandler } from './handlers/OPTIONS.handler';
import { PROPFINDRequestHandler } from './handlers/PROPFIND.handler';
import { webdavLogger } from '../utils/logger.utils';
import bodyParser from 'body-parser';
import { SdkManager } from '../services/sdk-manager.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';

export class WebDavServer {
  private app = express();
  private initUserCredentials = async () => {
    const credentials = await ConfigService.instance.readUser();
    if (!credentials) throw new Error('Missing credentials, cannot init WebDav server');
    SdkManager.init({
      token: credentials?.token,
      newToken: credentials?.newToken,
    });
  };

  private registerMiddlewares = () => {
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
  };

  private registerHandlers = () => {
    this.app.options('/webdav', new OPTIONSRequestHandler({ debug: true }).handle);
    this.app.propfind(
      '/webdav',
      new PROPFINDRequestHandler(
        { debug: true },
        {
          driveFolderService: DriveFolderService.instance,
          configService: ConfigService.instance,
        },
      ).handle,
    );
  };

  async start() {
    const port = ConfigService.instance.get('WEBDAV_SERVER_PORT');
    await this.initUserCredentials();
    this.app.disable('x-powered-by');

    this.registerMiddlewares();
    this.registerHandlers();

    this.app.listen(port, () => {
      webdavLogger.info(`WebDAV server listening at http://localhost:${port}`);
    });
  }
}
