import { expect } from 'chai';
import { ErrorUtils } from '../../src/utils/errors.utils';
import sinon from 'sinon';
describe('Errors Utils', () => {
  let errorSpy = sinon.spy(console, 'error');

  beforeEach(() => {
    errorSpy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    errorSpy.restore();
  });

  it('When reporting an error, should call console.error with the expected message and properties', () => {
    const error = new Error('Test Error');
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(errorSpy.calledOnce).to.be.true;
    expect(errorSpy.firstCall.args[0]).to.contain('[REPORTED_ERROR]');
    expect(errorSpy.firstCall.args[0]).to.contain(error.message);
    expect(errorSpy.firstCall.args[0]).to.contain(JSON.stringify(props, null, 2));
    expect(errorSpy.firstCall.args[0]).to.contain(error.stack);
  });

  it('When reporting an object, should call console.error with the expected message and properties', () => {
    const error = { data: 'error data' };
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(errorSpy.calledOnce).to.be.true;
    expect(errorSpy.firstCall.args[0]).to.contain('[REPORTED_ERROR]');

    expect(errorSpy.firstCall.args[0]).to.contain(JSON.stringify(props, null, 2));
  });
});
