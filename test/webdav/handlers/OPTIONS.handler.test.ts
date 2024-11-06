import sinon from 'sinon';
import { OPTIONSRequestHandler } from '../../../src/webdav/handlers/OPTIONS.handler';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { expect } from 'chai';

describe('OPTIONS request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends an OPTIONS request, it should return the allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'OPTIONS',
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      header: sinon.stub(),
      status: sinon.stub().returns({ send: sinon.stub() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status.calledWith(200)).to.be.true;
    expect(
      response.header.calledWith(
        'Allow',
        'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK',
      ),
    ).to.be.true;
    expect(response.header.calledWith('DAV', '1, 2, ordered-collections')).to.be.true;
  });
});
