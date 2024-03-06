import sinon from 'sinon';
import { AuthMiddleware } from '../../../src/webdav/middewares/auth.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { ConfigService } from '../../../src/services/config.service';
import { expect } from 'chai';

describe('Auth middleware', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('When a request is made to the WebDav server, and the user is not authenticated, should return 401', async () => {
    const req = createWebDavRequestFixture({
      user: null,
    });
    const res = createWebDavResponseFixture({});
    const next = sinon.spy();

    const configServiceStub = sandbox.stub(ConfigService.instance, 'readUser').resolves(undefined);

    await AuthMiddleware(ConfigService.instance)(req, res, next);

    expect(configServiceStub.calledOnce).to.be.true;
    expect(next.notCalled).to.be.true;
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.send.calledWithMatch({ error: 'Unauthorized' })).to.be.true;
  });
});
