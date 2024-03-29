import { Express } from 'express';
import https from 'https';
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
import { SdkManager } from '../services/sdk-manager.service';
import { NetworkFacade } from '../services/network/network-facade.service';
import { NetworkUtils } from '../utils/network.utils';

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

  private async getNetwork() {
    const credentials = await this.configService.readUser();
    if (!credentials) throw new Error('Credentials not found in Config service, cannot create network');
    const networkModule = SdkManager.instance.getNetwork({
      user: credentials.user.bridgeUser,
      pass: credentials.user.userId,
    });

    return new NetworkFacade(networkModule, this.uploadService, this.downloadService, this.cryptoService);
  }
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

  private registerHandlers = async () => {
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
          networkFacade: await this.getNetwork(),
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

    https.createServer(NetworkUtils.getWebdavSSLCerts(), this.app).listen(port, () => {
      webdavLogger.info(`Internxt WebDav server listening at https://${ConfigService.WEBDAV_LOCAL_URL}:${port}`);
    });
  }
}
