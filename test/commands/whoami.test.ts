import { expect, test } from '@oclif/test';

describe('whoami', () => {
  test
    .stdout()
    .command(['whoami'])
    .it('runs whoami', (ctx) => {
      expect(ctx.stdout).to.contain('You are');
    });
});
