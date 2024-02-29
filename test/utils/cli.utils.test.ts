import sinon from 'sinon';
import { CLIUtils } from '../../src/utils/cli.utils';
import { expect } from 'chai';
describe('CLI utils', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('should run a test', () => {
    const writeSpy = sinon.spy(process.stdout, 'write');
    const clearLineSpy = sinon.spy(process.stdout, 'clearLine');

    CLIUtils.clearPreviousLine();

    expect(writeSpy.calledWith('\x1b[1A')).to.be.true;
    expect(clearLineSpy.calledWith(0)).to.be.true;
  });
});
