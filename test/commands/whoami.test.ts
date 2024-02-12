import { expect, test } from '@oclif/test';
import { OclifStdoutContext } from '../types/oclif-test.types';

describe('whoami', () => {
  test
    .stdout()
    .command(['whoami'])
    .it('runs whoami', (ctx: OclifStdoutContext) => {
      expect(ctx.stdout).to.contain('You are');
    });
});
