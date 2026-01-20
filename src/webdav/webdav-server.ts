import { Express } from 'express';
import https from 'node:https';
import http from 'node:http';
import { ConfigService } from '../services/config.service';
import { OPTIONSRequestHandler } from './handlers/OPTIONS.handler';
import { PROPFINDRequestHandler } from './handlers/PROPFIND.handler';
import { webdavLogger } from '../utils/logger.utils';
import bodyParser from 'body-parser';
import { AuthMiddleware } from './middewares/auth.middleware';
import { RequestLoggerMiddleware } from './middewares/request-logger.middleware';
import { GETRequestHandler } from './handlers/GET.handler';
import { HEADRequestHandler } from './handlers/HEAD.handler';
import { ErrorHandlingMiddleware } from './middewares/errors.middleware';
import asyncHandler from 'express-async-handler';
import { SdkManager } from '../services/sdk-manager.service';
import { NetworkUtils } from '../utils/network.utils';
import { PUTRequestHandler } from './handlers/PUT.handler';
import { MKCOLRequestHandler } from './handlers/MKCOL.handler';
import { DELETERequestHandler } from './handlers/DELETE.handler';
import { PROPPATCHRequestHandler } from './handlers/PROPPATCH.handler';
import { MOVERequestHandler } from './handlers/MOVE.handler';
import { COPYRequestHandler } from './handlers/COPY.handler';
import { MkcolMiddleware } from './middewares/mkcol.middleware';

export class WebDavServer {
  constructor(private readonly app: Express) {}

  private readonly registerStartMiddlewares = () => {
    this.app.use(AuthMiddleware());
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
    this.app.head(serverListenPath, asyncHandler(new HEADRequestHandler().handle));
    this.app.get(serverListenPath, asyncHandler(new GETRequestHandler().handle));
    this.app.options(serverListenPath, asyncHandler(new OPTIONSRequestHandler().handle));
    this.app.propfind(serverListenPath, asyncHandler(new PROPFINDRequestHandler().handle));

    this.app.put(serverListenPath, asyncHandler(new PUTRequestHandler().handle));

    this.app.mkcol(serverListenPath, asyncHandler(new MKCOLRequestHandler().handle));
    this.app.delete(serverListenPath, asyncHandler(new DELETERequestHandler().handle));
    this.app.proppatch(serverListenPath, asyncHandler(new PROPPATCHRequestHandler().handle));
    this.app.move(serverListenPath, asyncHandler(new MOVERequestHandler().handle));
    this.app.copy(serverListenPath, asyncHandler(new COPYRequestHandler().handle));
  };

  start = async () => {
    const configs = await ConfigService.instance.readWebdavConfig();
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
