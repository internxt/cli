import { expect } from 'chai';
import { test } from '@oclif/test';
import { ux } from '@oclif/core';
import { ValidationService } from '../../src/services/validation.service';
import { AuthService } from '../../src/services/auth.service';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture, UserLoginFixture } from '../fixtures/login.fixture';

describe.skip('Login Command', () => {
  describe('When user logs in using flags and 2fa is enabled, then its credentials are saved into a file', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(ValidationService.instance, 'validate2FA', (stub) => stub.returns(true))
      .stub(AuthService.instance, 'is2FANeeded', (stub) => stub.resolves(true))
      .stub(AuthService.instance, 'doLogin', (stub) => stub.resolves(UserCredentialsFixture))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command([
        'login',
        `-e ${UserLoginFixture.email}`,
        `-p ${UserLoginFixture.password}`,
        `-w ${UserLoginFixture.twoFactor}`,
      ])
      .it('runs login with 2fa using flags', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ Succesfully logged in to: ${UserLoginFixture.email}\n`);
      });

    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(AuthService.instance, 'is2FANeeded', (stub) => stub.resolves(false))
      .stub(AuthService.instance, 'doLogin', (stub) => stub.resolves(UserCredentialsFixture))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login', `-e ${UserLoginFixture.email}`, `-p ${UserLoginFixture.password}`])
      .it('runs login without 2fa using flags', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ Succesfully logged in to: ${UserLoginFixture.email}\n`);
      });
  });

  describe('When user logs in forcing non-interactive flags and 2fa is enabled, then its credentials are saved into a file', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(ValidationService.instance, 'validate2FA', (stub) => stub.returns(true))
      .stub(AuthService.instance, 'is2FANeeded', (stub) => stub.resolves(true))
      .stub(AuthService.instance, 'doLogin', (stub) => stub.resolves(UserCredentialsFixture))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command([
        'login',
        '-n',
        `-e ${UserLoginFixture.email}`,
        `-p ${UserLoginFixture.password}`,
        `-w ${UserLoginFixture.twoFactor}`,
      ])
      .it('runs login forcing non-interactive flags', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ Succesfully logged in to: ${UserLoginFixture.email}\n`);
      });
  });

  describe('When user logs in forcing non-interactive flags but any param is missing, then an error is thrown', () => {
    test
      .stdout()
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login', '-n', `-p ${UserLoginFixture.password}`, `-w ${UserLoginFixture.twoFactor}`])
      .exit(1)
      .it('runs login forcing non-interactive flags without email and expects an error');

    test
      .stdout()
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login', '-n', `-e ${UserLoginFixture.email}`, `-w ${UserLoginFixture.twoFactor}`])
      .exit(1)
      .it('runs login forcing non-interactive flags without password and expects an error');

    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(AuthService.instance, 'is2FANeeded', (stub) => stub.resolves(true))
      .stub(AuthService.instance, 'doLogin', (stub) => stub.resolves(UserCredentialsFixture))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login', '-n', `-e ${UserLoginFixture.email}`, `-p ${UserLoginFixture.password}`])
      .exit(1)
      .it('runs login forcing non-interactive flags without 2fa and expects an error');
  });

  describe('When user logs in interactively, then its credentials are saved into a file', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(ValidationService.instance, 'validate2FA', (stub) => stub.returns(true))
      .stub(AuthService.instance, 'is2FANeeded', (stub) => stub.resolves(true))
      .stub(AuthService.instance, 'doLogin', (stub) => stub.resolves(UserCredentialsFixture))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .stub(ux, 'prompt', (stub) => stub.resolves('any input'))
      // commented because is not working, but i wish it would
      //.stub(ux, 'prompt', (stub) => stub.withArgs('What is your email?').resolves(UserLogin.email))
      //.stub(ux, 'prompt', (stub) => stub.withArgs('What is your password?').resolves(UserLogin.password))
      //.stub(ux, 'prompt', (stub) => stub.withArgs('What is your two-factor token?').resolves(UserLogin.twoFactor))
      .command(['login'])
      .it('runs login interactively', (ctx) => {
        expect(ctx.stdout).to.be.equal(`✓ Succesfully logged in to: ${UserLoginFixture.email}\n`);
      });
  });

  describe('When user logs in interactively but email is not valid, then an error is thrown', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(false))
      .stub(ux, 'prompt', (stub) => stub.returns('any input'))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login'])
      .exit(1)
      .it('runs login interactively and expects error (app exit with code 1)');
  });

  describe('When user logs in interactively but password is empty, then an error is thrown', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(ux, 'prompt', (stub) => stub.returns(''))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login'])
      .exit(1)
      .it('runs login interactively and expects error (app exit with code 1)');
  });

  describe('When user logs in interactively but 2fa code is not valid, then an error is thrown', () => {
    test
      .stdout()
      .stub(ValidationService.instance, 'validateEmail', (stub) => stub.returns(true))
      .stub(ValidationService.instance, 'validate2FA', (stub) => stub.returns(false))
      .stub(ux, 'prompt', (stub) => stub.returns('any input'))
      .stub(ConfigService.instance, 'saveUser', (stub) => stub.resolves())
      .command(['login'])
      .exit(1)
      .it('runs login interactively and expects error (app exit with code 1)');
  });
});
