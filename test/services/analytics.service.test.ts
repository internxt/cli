import sinon from 'sinon';
import { AnalyticsEvents, AnalyticsService } from '../../src/services/analytics.service';
import { expect } from 'chai';

describe('Analytics service', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a track request is made, should be able to track events', async () => {
    const analyticsService = AnalyticsService.instance;

    // @ts-expect-error - Stubbing private method
    const getRudderstackStub: sinon.SinonStub = sinon.stub(analyticsService, 'getRudderstack').returns({
      // @ts-expect-error - Stubbing private method
      track: sinon.stub().callsArg(1),
    });

    const eventKey = 'CLILogin';
    const options: { app: 'internxt-cli'; userId: string } = { app: 'internxt-cli', userId: 'testUserId' };
    const params = { customParam: 'value' };

    await analyticsService.track(eventKey, options, params);

    expect(getRudderstackStub.calledOnce).to.be.true;
    expect(getRudderstackStub.calledWithExactly()).to.be.true;

    expect(getRudderstackStub.firstCall.returnValue.track.calledOnce).to.be.true;
    expect(getRudderstackStub.firstCall.returnValue.track.args[0][0]).to.contain({
      event: AnalyticsEvents[eventKey],
      userId: options.userId,
    });
  });
});
