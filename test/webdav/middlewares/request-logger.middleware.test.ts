import sinon from 'sinon';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { RequestLoggerMiddleware } from '../../../src/webdav/middewares/request-logger.middleware';
import { expect } from 'chai';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('Request logger middleware', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a request is received, should log only the specified methods', () => {
    const req = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/path',
    });
    const next = sandbox.spy();
    const infoStub = sandbox.stub(webdavLogger, 'info');

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'] });
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub.calledOnce).to.be.true;
    expect(infoStub.calledWithMatch(/WebDav request received/)).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it('When a request is received, should not log the request if the method is not specified', () => {
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/path',
    });
    const next = sandbox.spy();
    const infoStub = sandbox.stub(webdavLogger, 'info');

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'] });
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub.notCalled).to.be.true;
    expect(next.calledOnce).to.be.true;
  });
});
