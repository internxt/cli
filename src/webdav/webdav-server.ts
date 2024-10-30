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
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';
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
import { PUTRequestHandler } from './handlers/PUT.handler';
import { MKCOLRequestHandler } from './handlers/MKCOL.handler';
import { DELETERequestHandler } from './handlers/DELETE.handler';
import { PROPPATCHRequestHandler } from './handlers/PROPPATCH.handler';
import { MOVERequestHandler } from './handlers/MOVE.handler';
import { COPYRequestHandler } from './handlers/COPY.handler';
import { TrashService } from '../services/drive/trash.service';
import { AnalyticsService } from '../services/analytics.service';

export class WebDavServer {
  constructor(
    private app: Express,
    private configService: ConfigService,
    private driveFileService: DriveFileService,
    private driveFolderService: DriveFolderService,
    private driveDatabaseManager: DriveDatabaseManager,
    private uploadService: UploadService,
    private downloadService: DownloadService,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private trashService: TrashService,
  ) {}

  private async getNetworkFacade() {
    const credentials = await this.configService.readUser();

    if (!credentials) throw new Error('Credentials not found in Config service, do login first');
    const networkModule = SdkManager.instance.getNetwork({
      user: credentials.user.bridgeUser,
      pass: credentials.user.userId,
    });

    return new NetworkFacade(networkModule, this.uploadService, this.downloadService, this.cryptoService);
  }

  private registerMiddlewares = async () => {
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
    this.app.use(ErrorHandlingMiddleware);
    this.app.use(AuthMiddleware(ConfigService.instance));
    this.app.use(
      RequestLoggerMiddleware(
        {
          enable: true,
        },
        AnalyticsService.instance,
      ),
    );
  };

  private registerHandlers = async () => {
    const networkFacade = await this.getNetworkFacade();
    this.app.head('*', asyncHandler(new HEADRequestHandler().handle));
    this.app.get(
      '*',
      asyncHandler(
        new GETRequestHandler({
          driveFileService: this.driveFileService,
          driveDatabaseManager: this.driveDatabaseManager,
          uploadService: this.uploadService,
          downloadService: this.downloadService,
          cryptoService: this.cryptoService,
          authService: this.authService,
          networkFacade: networkFacade,
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
            driveFileService: this.driveFileService,
            driveFolderService: this.driveFolderService,
            driveDatabaseManager: this.driveDatabaseManager,
          },
        ).handle,
      ),
    );

    this.app.put(
      '*',
      asyncHandler(
        new PUTRequestHandler({
          driveFileService: this.driveFileService,
          driveDatabaseManager: this.driveDatabaseManager,
          uploadService: this.uploadService,
          downloadService: this.downloadService,
          cryptoService: this.cryptoService,
          authService: this.authService,
          networkFacade: networkFacade,
        }).handle,
      ),
    );

    this.app.mkcol(
      '*',
      asyncHandler(
        new MKCOLRequestHandler({
          driveDatabaseManager: this.driveDatabaseManager,
          driveFolderService: this.driveFolderService,
        }).handle,
      ),
    );
    this.app.delete(
      '*',
      asyncHandler(
        new DELETERequestHandler({
          driveDatabaseManager: this.driveDatabaseManager,
          trashService: this.trashService,
          driveFileService: this.driveFileService,
          driveFolderService: this.driveFolderService,
        }).handle,
      ),
    );
    this.app.proppatch('*', asyncHandler(new PROPPATCHRequestHandler().handle));
    this.app.move(
      '*',
      asyncHandler(
        new MOVERequestHandler({
          driveDatabaseManager: this.driveDatabaseManager,
          driveFolderService: this.driveFolderService,
          driveFileService: this.driveFileService,
        }).handle,
      ),
    );
    this.app.copy('*', asyncHandler(new COPYRequestHandler().handle));
  };

  async start() {
    const port = this.configService.get('WEBDAV_SERVER_PORT');
    this.app.disable('x-powered-by');
    await this.registerMiddlewares();
    await this.registerHandlers();

    const server = https.createServer(NetworkUtils.getWebdavSSLCerts(), this.app).listen(port, () => {
      webdavLogger.info(`Internxt WebDav server listening at https://${ConfigService.WEBDAV_LOCAL_URL}:${port}`);
    });
    // Allow long uploads/downloads from WebDAV clients (up to 15 minutes before closing connection):
    server.requestTimeout = 15 * 60 * 1000;
  }
}
