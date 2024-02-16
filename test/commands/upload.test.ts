import { expect, test } from '@oclif/test';

describe('upload', () => {
  test
    .stdout()
    .command(['upload'])
    .it('runs hello', (ctx) => {
      return expect(ctx.stdout).to.contain('hello world');
    });
});
