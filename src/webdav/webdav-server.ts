import { Express } from 'express';
import { ConfigService } from '../services/config.service';
import { OPTIONSRequestHandler } from './handlers/OPTIONS.handler';
import { PROPFINDRequestHandler } from './handlers/PROPFIND.handler';
import { webdavLogger } from '../utils/logger.utils';
import bodyParser from 'body-parser';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { AuthMiddleware } from './middewares/auth.middleware';
import { RequestLoggerMiddleware } from './middewares/request-logger.middleware';
import { DriveRealmManager } from '../services/realms/drive-realm-manager.service';
import { GETRequestHandler } from './handlers/GET.handler';
import { HEADRequestHandler } from './handlers/HEAD.handler';
import { DriveFileService } from '../services/drive/drive-file.service';
import { UploadService } from '../services/network/upload.service';
import { DownloadService } from '../services/network/download.service';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { ErrorHandlingMiddleware } from './middewares/errors.middleware';
import asyncHandler from 'express-async-handler';

export class WebDavServer {
  constructor(
    private app: Express,
    private configService: ConfigService,
    private driveFileService: DriveFileService,
    private driveFolderService: DriveFolderService,
    private driveRealmManager: DriveRealmManager,
    private uploadService: UploadService,
    private downloadService: DownloadService,
    private authService: AuthService,
    private cryptoService: CryptoService,
  ) {}

  private registerMiddlewares = () => {
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
    this.app.use(ErrorHandlingMiddleware);
    this.app.use(
      RequestLoggerMiddleware({
        enable: false,
      }),
    );
    this.app.use(AuthMiddleware(ConfigService.instance));
  };

  private registerHandlers = () => {
    this.app.head('*', asyncHandler(new HEADRequestHandler().handle));
    this.app.get(
      '*',
      asyncHandler(
        new GETRequestHandler({
          driveFileService: this.driveFileService,
          driveRealmManager: this.driveRealmManager,
          uploadService: this.uploadService,
          downloadService: this.downloadService,
          cryptoService: this.cryptoService,
          authService: this.authService,
        }).handle,
      ),
    );
    this.app.options('*', asyncHandler(new OPTIONSRequestHandler().handle));
    this.app.propfind(
      '*',
      asyncHandler(
        new PROPFINDRequestHandler(
          { debug: true },
          {
            driveFolderService: this.driveFolderService,
            driveRealmManager: this.driveRealmManager,
          },
        ).handle,
      ),
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
