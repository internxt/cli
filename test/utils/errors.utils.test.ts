import { expect } from 'chai';
import { ErrorUtils } from '../../src/utils/errors.utils';
import sinon from 'sinon';

describe('Errors Utils', () => {
  const reporter = sinon.spy();

  afterEach(() => {
    reporter.resetHistory();
  });

  it('When reporting an error, should call console.error with the expected message and properties', () => {
    const error = new Error('Test Error');
    const props = { key: 'value' };

    ErrorUtils.report(reporter, error, props);

    expect(reporter.calledOnce).to.be.true;
    expect(reporter.firstCall.args[0]).to.contain('[REPORTED_ERROR]');
    expect(reporter.firstCall.args[0]).to.contain(error.message);
    expect(reporter.firstCall.args[0]).to.contain(JSON.stringify(props, null, 2));
    expect(reporter.firstCall.args[0]).to.contain(error.stack);
  });

  it('When reporting an object, should call console.error with the expected message and properties', () => {
    const error = { data: 'error data' };
    const props = { key: 'value' };

    ErrorUtils.report(reporter, error, props);

    expect(reporter.calledOnce).to.be.true;
    expect(reporter.firstCall.args[0]).to.contain('[REPORTED_ERROR]');
    expect(reporter.firstCall.args[0]).to.contain(JSON.stringify(props, null, 2));
  });
});
