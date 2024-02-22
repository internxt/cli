import { expect } from 'chai';
import test from '@oclif/test';
import { ConfigService } from '../../src/services/config.service';
import { UserFixture } from '../fixtures/auth.fixture';

describe('Whoami Command', () => {
  describe('When user is logged in and whoami is called, then the current user logged in is printed', () => {
    const userCredentials = {
      user: UserFixture,
      token: 'test_auth_token',
      newToken: 'test_new_auth_token',
      mnemonic: 'test_mnemonic',
    };
    test
      .stdout()
      .stub(ConfigService.instance, 'readUser', (stub) => stub.resolves(userCredentials))
      .command(['whoami'])
      .it('runs whoami and expects user to be logged in', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ You are logged in with: ${userCredentials.user.email}\n`);
      });
  });

  describe('When user is logged out and whoami is called, then no user is printed', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'readUser', (stub) => stub.resolves(undefined))
      .command(['whoami'])
      .it('runs whoami and expects user to not be logged', (ctx) => {
        expect(ctx.stdout).to.be.equal('✓ You are not logged in\n');
      });
  });
});
