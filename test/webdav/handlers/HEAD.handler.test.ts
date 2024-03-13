import sinon from 'sinon';
import { HEADRequestHandler } from '../../../src/webdav/handlers/HEAD.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('HEAD request handler', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a WebDav client sends a HEAD request, it should reply with a 405', async () => {
    const requestHandler = new HEADRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'HEAD',
    });

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    await requestHandler.handle(request, response);

    sinon.assert.calledWith(response.status, 405);
  });
});
