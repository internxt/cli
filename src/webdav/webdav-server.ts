import { Express } from 'express';
import https from 'https';
import http from 'http';
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

export class WebDavServer {
  constructor(
    private readonly app: Express,
    private readonly configService: ConfigService,
    private readonly driveFileService: DriveFileService,
    private readonly driveFolderService: DriveFolderService,
    private readonly driveDatabaseManager: DriveDatabaseManager,
    private readonly uploadService: UploadService,
    private readonly downloadService: DownloadService,
    private readonly authService: AuthService,
    private readonly cryptoService: CryptoService,
    private readonly trashService: TrashService,
  ) {}

  private readonly getNetworkFacade = async () => {
    const credentials = await this.configService.readUser();

    if (!credentials) throw new Error('Credentials not found in Config service, do login first');
    const networkModule = SdkManager.instance.getNetwork({
      user: credentials.user.bridgeUser,
      pass: credentials.user.userId,
    });

    return new NetworkFacade(networkModule, this.uploadService, this.downloadService, this.cryptoService);
  };

  private readonly registerMiddlewares = async () => {
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
    this.app.use(ErrorHandlingMiddleware);
    this.app.use(AuthMiddleware(AuthService.instance));
    this.app.use(
      RequestLoggerMiddleware({
        enable: true,
      }),
    );
  };

  private readonly registerHandlers = async () => {
    const networkFacade = await this.getNetworkFacade();
    this.app.head(
      '*',
      asyncHandler(
        new HEADRequestHandler({
          driveFileService: this.driveFileService,
          driveDatabaseManager: this.driveDatabaseManager,
        }).handle,
      ),
    );
    this.app.get(
      '*',
      asyncHandler(
        new GETRequestHandler({
          driveFileService: this.driveFileService,
          driveDatabaseManager: this.driveDatabaseManager,
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
        new PROPFINDRequestHandler({
          driveFileService: this.driveFileService,
          driveFolderService: this.driveFolderService,
          driveDatabaseManager: this.driveDatabaseManager,
        }).handle,
      ),
    );

    this.app.put(
      '*',
      asyncHandler(
        new PUTRequestHandler({
          driveFileService: this.driveFileService,
          driveFolderService: this.driveFolderService,
          driveDatabaseManager: this.driveDatabaseManager,
          authService: this.authService,
          trashService: this.trashService,
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

  start = async () => {
    const configs = await this.configService.readWebdavConfig();
    this.app.disable('x-powered-by');
    await this.registerMiddlewares();
    await this.registerHandlers();

    const plainHttp = configs.protocol === 'http';
    let server: http.Server | https.Server;
    if (plainHttp) {
      server = http.createServer(this.app);
    } else {
      const httpsCerts = await NetworkUtils.getWebdavSSLCerts();
      server = https.createServer(httpsCerts, this.app);
    }

    // Allow long uploads/downloads from WebDAV clients (up to 15 minutes before closing connection):
    server.requestTimeout = 15 * 60 * 1000;

    server.listen(configs.port, () => {
      webdavLogger.info(
        `Internxt WebDav server listening at ${configs.protocol}://${ConfigService.WEBDAV_LOCAL_URL}:${configs.port}`,
      );
    });
  };
}
