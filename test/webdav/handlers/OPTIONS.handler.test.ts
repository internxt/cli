import sinon from 'sinon';
import { OPTIONSRequestHandler } from '../../../src/webdav/handlers/OPTIONS.handler';
import { mockReq, mockRes } from 'sinon-express-mock';
describe('OPTIONS request handler', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a WebDav client sends an OPTIONS request, it should return the allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = mockReq({
      method: 'OPTIONS',
    });

    const response = mockRes({
      header: sinon.stub(),
      status: sinon.stub().returns({ send: sinon.stub() }),
    });

    await requestHandler.handle(request, response);

    sinon.assert.calledWith(
      response.header,
      'Allow',
      'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK',
    );
  });
});
