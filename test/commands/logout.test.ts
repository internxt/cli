import { expect } from 'chai';
import { test } from '@oclif/test';
import { ConfigService } from '../../src/services/config.service';

describe('Logout Command', () => {
  describe('When user is logged in and logout is called, then the current user logged out', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'clearUser', (stub) => stub.resolves())
      .command(['logout'])
      .it('runs logout', (ctx) => {
        expect(ctx.stdout).to.be.equal('✓ User logged out correctly\n');
      });
  });

  describe('When user cannot be logged out, then an error is thrown', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'clearUser', (stub) => stub.rejects())
      .command(['logout'])
      .exit(1)
      .it('runs logout and expects error (app exit with code 1)');
  });
});
