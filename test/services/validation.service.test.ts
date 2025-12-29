import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@internxt/lib';
import { randomInt, randomUUID } from 'node:crypto';
import { UserFixture } from '../fixtures/auth.fixture';
import { ValidationService } from '../../src/services/validation.service';

describe('Validation Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When email is not valid, then validation service validates it as expected', () => {
    vi.spyOn(auth, 'isValidEmail').mockReturnValue(false);
    const isValidEmail = ValidationService.instance.validateEmail(UserFixture.email);
    expect(isValidEmail).to.be.equal(false);
  });

  it('When two factor auth code is validated, then validation service validates it as expected', () => {
    expect(ValidationService.instance.validate2FA('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validate2FA('loremi')).to.be.equal(false);
    expect(ValidationService.instance.validate2FA('123456')).to.be.equal(true);
  });

  it('When v4 uuid is validated, then validation service validates it as expected', () => {
    expect(ValidationService.instance.validateUUIDv4('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('loremipsum')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('11111111-1111-1111-1111-111111111111')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('BBBBBBBB-BBBB-4BBB-ABBB-BBBBBBBBBBBB')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4('22222222-2222-4222-8222-222222222222')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4('6cd6894a-2996-4729-8a4a-955d5a84c0c7')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4(randomUUID())).to.be.equal(true);
  });

  it('When yes or not string is validated, then validation service validates it as expected', () => {
    expect(ValidationService.instance.validateYesOrNoString('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validateYesOrNoString('loremipsum')).to.be.equal(false);
    expect(ValidationService.instance.validateYesOrNoString('')).to.be.equal(false);
    expect(ValidationService.instance.validateYesOrNoString('11111111-1111-1111-1111-111111111111')).to.be.equal(false);
    expect(ValidationService.instance.validateYesOrNoString('yes')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('YES')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('no')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('NO')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('Y')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('N')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('y')).to.be.equal(true);
    expect(ValidationService.instance.validateYesOrNoString('n')).to.be.equal(true);
  });

  it('When tcp port is validated, then validation service validates it as expected', () => {
    expect(ValidationService.instance.validateTCPIntegerPort('0')).to.be.equal(false);
    expect(ValidationService.instance.validateTCPIntegerPort('65536')).to.be.equal(false);
    expect(ValidationService.instance.validateTCPIntegerPort('')).to.be.equal(false);
    expect(ValidationService.instance.validateTCPIntegerPort('loremipsumA')).to.be.equal(false);
    expect(ValidationService.instance.validateTCPIntegerPort('11111111-1111-1111-1111-111111111111')).to.be.equal(
      false,
    );
    expect(ValidationService.instance.validateTCPIntegerPort('3005')).to.be.equal(true);
    expect(ValidationService.instance.validateTCPIntegerPort('65535')).to.be.equal(true);
    expect(ValidationService.instance.validateTCPIntegerPort('1')).to.be.equal(true);
    expect(ValidationService.instance.validateTCPIntegerPort(String(randomInt(1, 65535)))).to.be.equal(true);
  });

  it('When empty string is validated, then validation service validates it as expected', () => {
    expect(ValidationService.instance.validateStringIsNotEmpty('1234567')).to.be.equal(true);
    expect(ValidationService.instance.validateStringIsNotEmpty('loremipsum')).to.be.equal(true);
    expect(ValidationService.instance.validateStringIsNotEmpty(' a')).to.be.equal(true);
    expect(ValidationService.instance.validateStringIsNotEmpty('b ')).to.be.equal(true);
    expect(ValidationService.instance.validateStringIsNotEmpty('')).to.be.equal(false);
    expect(ValidationService.instance.validateStringIsNotEmpty('        ')).to.be.equal(false);
    expect(ValidationService.instance.validateStringIsNotEmpty('  ')).to.be.equal(false);
    expect(ValidationService.instance.validateStringIsNotEmpty('\n')).to.be.equal(false);
    expect(ValidationService.instance.validateStringIsNotEmpty('\t')).to.be.equal(false);
    expect(ValidationService.instance.validateStringIsNotEmpty('\t\n')).to.be.equal(false);
  });
  describe('parseJwtExpiration', () => {
    it('When token is undefined, then returns null', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration(undefined)).to.be.equal(null);
    });

    it('When token is not a string, then returns null', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration('')).to.be.equal(null);
    });

    it('When token does not have 3 parts, then returns null', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration('invalid')).to.be.equal(null);
      expect(ValidationService.instance.validateJwtAndCheckExpiration('invalid.token')).to.be.equal(null);
    });

    it('When token payload is not valid base64, then returns null', () => {
      const invalidToken = 'header.!!!invalid_base64!!!.signature';
      expect(ValidationService.instance.validateJwtAndCheckExpiration(invalidToken)).to.be.equal(null);
    });

    it('When token payload does not contain exp claim, then returns null', () => {
      const payload = btoa(JSON.stringify({ sub: 'user123' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(null);
    });

    it('When token payload exp is not a number, then returns null', () => {
      const payload = btoa(JSON.stringify({ exp: 'not-a-number' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(null);
    });

    it('When token has valid structure with exp claim, then returns expiration timestamp', () => {
      const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = btoa(JSON.stringify({ exp: expiration, sub: 'user123' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(expiration);
    });
  });

  describe('checkTokenExpiration', () => {
    it('When token expired more than 2 days ago, then expired is true and refreshRequired is false', () => {
      const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(threeDaysAgo);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    it('When token expired 1 second ago, then expired is true and refreshRequired is false', () => {
      const oneSecondAgo = Math.floor(Date.now() / 1000) - 1;
      const result = ValidationService.instance.checkTokenExpiration(oneSecondAgo);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    it('When token expires in exactly 0 seconds (now), then expired is true', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = ValidationService.instance.checkTokenExpiration(now);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    it('When token expires in 1 day, then expired is false and refreshRequired is true', () => {
      const oneDayFromNow = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(oneDayFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(true);
    });

    it('When token expires in exactly 2 days, then expired is false and refreshRequired is true', () => {
      const twoDaysFromNow = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(twoDaysFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(true);
    });

    it('When token expires in 2 days + 1 second, then expired is false and refreshRequired is false', () => {
      const twoDaysPlusOneSecond = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60 + 1;
      const result = ValidationService.instance.checkTokenExpiration(twoDaysPlusOneSecond);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(false);
    });

    it('When token expires in 30 days, then expired is false and refreshRequired is false', () => {
      const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(thirtyDaysFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(false);
    });
  });

  describe('validateTokenAndCheckExpiration', () => {
    it('When token is undefined, then returns invalid with expired true', () => {
      const result = ValidationService.instance.validateTokenAndCheckExpiration(undefined);
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('When token is malformed, then returns invalid with expired true', () => {
      const result = ValidationService.instance.validateTokenAndCheckExpiration('invalid.token');
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('When token is valid but expired, then returns valid with expired true', () => {
      const expiration = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = btoa(JSON.stringify({ exp: expiration }));
      const token = `header.${payload}.signature`;

      const result = ValidationService.instance.validateTokenAndCheckExpiration(token);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('When token is valid and expires in 1 day, then returns valid with refreshRequired true', () => {
      const expiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 1 day from now
      const payload = btoa(JSON.stringify({ exp: expiration }));
      const token = `header.${payload}.signature`;

      const result = ValidationService.instance.validateTokenAndCheckExpiration(token);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
      expect(result.expiration.refreshRequired).to.be.equal(true);
    });

    it('When token is valid and expires in 30 days, then returns valid with both false', () => {
      const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
      const payload = btoa(JSON.stringify({ exp: expiration }));
      const token = `header.${payload}.signature`;

      const result = ValidationService.instance.validateTokenAndCheckExpiration(token);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });
  });
});
