import sinon from 'sinon';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { RequestLoggerMiddleware } from '../../../src/webdav/middewares/request-logger.middleware';
import { expect } from 'chai';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { AnalyticsService } from '../../../src/services/analytics.service';

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

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true }, AnalyticsService.instance);
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

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true }, AnalyticsService.instance);
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub.notCalled).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it('When a request is received and there is logged in user, the request is tracked in analytics', () => {
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/path',
      user: {
        uuid: 'xxxx',
      },
    });
    const analytics = AnalyticsService.instance;

    const trackStub = sandbox.stub(analytics, 'track').resolves();
    const next = sandbox.spy();

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true }, analytics);
    middleware(req, createWebDavResponseFixture({}), next);

    expect(next.calledOnce).to.be.true;
    expect(trackStub.calledOnce).to.be.true;
  });
});
