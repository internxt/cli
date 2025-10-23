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
import { GETRequestHandler } from './handlers/GET.handler';
import { HEADRequestHandler } from './handlers/HEAD.handler';
import { DriveFileService } from '../services/drive/drive-file.service';
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
import { Environment } from '@internxt/inxt-js';
import { MkcolMiddleware } from './middewares/mkcol.middleware';
import { WebDavFolderService } from './services/webdav-folder.service';

export class WebDavServer {
  constructor(
    private readonly app: Express,
    private readonly configService: ConfigService,
    private readonly driveFileService: DriveFileService,
    private readonly driveFolderService: DriveFolderService,
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
    const environment = new Environment({
      bridgeUser: credentials.user.bridgeUser,
      bridgePass: credentials.user.userId,
      bridgeUrl: ConfigService.instance.get('NETWORK_URL'),
      encryptionKey: credentials.user.mnemonic,
      appDetails: SdkManager.getAppDetails(),
    });
    const networkFacade = new NetworkFacade(
      networkModule,
      environment,
      DownloadService.instance,
      CryptoService.instance,
    );

    return networkFacade;
  };

  private readonly registerStartMiddlewares = () => {
    this.app.use(AuthMiddleware(AuthService.instance));
    this.app.use(
      RequestLoggerMiddleware({
        enable: true,
      }),
    );
    this.app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
    this.app.use(MkcolMiddleware);
  };

  private readonly registerEndMiddleWares = () => {
    this.app.use(ErrorHandlingMiddleware);
  };

  private readonly registerHandlers = async () => {
    const serverListenPath = /(.*)/;
    const networkFacade = await this.getNetworkFacade();
    const webDavFolderService = new WebDavFolderService({
      driveFolderService: this.driveFolderService,
      configService: this.configService,
    });
    this.app.head(
      serverListenPath,
      asyncHandler(
        new HEADRequestHandler({
          driveFileService: this.driveFileService,
        }).handle,
      ),
    );
    this.app.get(
      serverListenPath,
      asyncHandler(
        new GETRequestHandler({
          driveFileService: this.driveFileService,
          downloadService: this.downloadService,
          cryptoService: this.cryptoService,
          authService: this.authService,
          networkFacade: networkFacade,
        }).handle,
      ),
    );
    this.app.options(serverListenPath, asyncHandler(new OPTIONSRequestHandler().handle));
    this.app.propfind(
      serverListenPath,
      asyncHandler(
        new PROPFINDRequestHandler({
          driveFileService: this.driveFileService,
          driveFolderService: this.driveFolderService,
        }).handle,
      ),
    );

    this.app.put(
      serverListenPath,
      asyncHandler(
        new PUTRequestHandler({
          driveFileService: this.driveFileService,
          webDavFolderService: webDavFolderService,
          authService: this.authService,
          trashService: this.trashService,
          networkFacade: networkFacade,
        }).handle,
      ),
    );

    this.app.mkcol(
      serverListenPath,
      asyncHandler(
        new MKCOLRequestHandler({
          driveFolderService: this.driveFolderService,
          webDavFolderService: webDavFolderService,
        }).handle,
      ),
    );
    this.app.delete(
      serverListenPath,
      asyncHandler(
        new DELETERequestHandler({
          trashService: this.trashService,
          driveFileService: this.driveFileService,
          driveFolderService: this.driveFolderService,
        }).handle,
      ),
    );
    this.app.proppatch(serverListenPath, asyncHandler(new PROPPATCHRequestHandler().handle));
    this.app.move(
      serverListenPath,
      asyncHandler(
        new MOVERequestHandler({
          driveFolderService: this.driveFolderService,
          driveFileService: this.driveFileService,
          webDavFolderService,
        }).handle,
      ),
    );
    this.app.copy(serverListenPath, asyncHandler(new COPYRequestHandler().handle));
  };

  start = async () => {
    const configs = await this.configService.readWebdavConfig();
    this.app.disable('x-powered-by');
    this.registerStartMiddlewares();
    await this.registerHandlers();
    this.registerEndMiddleWares();

    const plainHttp = configs.protocol === 'http';
    let server: http.Server | https.Server;
    if (plainHttp) {
      server = http.createServer(this.app);
    } else {
      const httpsCerts = await NetworkUtils.getWebdavSSLCerts(configs);
      server = https.createServer(httpsCerts, this.app);
    }

    // Allow long uploads/downloads from WebDAV clients:
    server.requestTimeout = configs.timeoutMinutes * 60 * 1000;

    server.listen(Number(configs.port), configs.host, undefined, () => {
      webdavLogger.info(
        `Internxt ${SdkManager.getAppDetails().clientVersion} WebDav server ` +
          `listening at ${configs.protocol}://${configs.host}:${configs.port}`,
      );
    });
  };
}
