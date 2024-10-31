import sinon from 'sinon';
import { HEADRequestHandler } from '../../../src/webdav/handlers/HEAD.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { expect } from 'chai';

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
    expect(response.status.calledWith(405)).to.be.true;
  });
});
