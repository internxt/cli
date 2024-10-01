import { expect } from 'chai';
import test from '@oclif/test';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture } from '../fixtures/login.fixture';

describe.skip('Whoami Command', () => {
  describe('When user is logged in and whoami is called, then the current user logged in is printed', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'readUser', (stub) => stub.resolves(UserCredentialsFixture))
      .command(['whoami'])
      .it('runs whoami and expects user to be logged in', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ You are logged in with: ${UserCredentialsFixture.user.email}\n`);
      });
  });

  describe('When user is logged out and whoami is called, then no user is printed', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'readUser', (stub) => stub.resolves(undefined))
      .command(['whoami'])
      .it('runs whoami and expects user to not be logged', (ctx) => {
        expect(ctx.stdout).to.be.equal('⚠ Error: You are not logged in\n');
      });
  });
});
