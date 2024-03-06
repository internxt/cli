import { Express } from 'express';
import { ConfigService } from '../services/config.service';
import { OPTIONSRequestHandler } from './handlers/OPTIONS.handler';
import { PROPFINDRequestHandler } from './handlers/PROPFIND.handler';
import { webdavLogger } from '../utils/logger.utils';
import bodyParser from 'body-parser';
import { SdkManager } from '../services/sdk-manager.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { AuthMiddleware } from './middewares/auth.middleware';
import { RequestLoggerMiddleware } from './middewares/request-logger.middleware';

export class WebDavServer {
  constructor(
    private app: Express,
    private configService: ConfigService,
    private driveFolderService: DriveFolderService,
  ) {}

  private registerMiddlewares = () => {
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
    this.app.use(RequestLoggerMiddleware({}));
    this.app.use(AuthMiddleware(ConfigService.instance));
  };

  private registerHandlers = () => {
    this.app.options('/webdav', new OPTIONSRequestHandler().handle);
    this.app.propfind(
      '/webdav',
      new PROPFINDRequestHandler(
        { debug: true },
        {
          driveFolderService: this.driveFolderService,
        },
      ).handle,
    );
  };

  async start() {
    const port = this.configService.get('WEBDAV_SERVER_PORT');
    this.app.disable('x-powered-by');

    this.registerMiddlewares();
    this.registerHandlers();

    this.app.listen(port, () => {
      webdavLogger.info(`Internxt WebDav server listening at http://localhost:${port}`);
    });
  }
}
