import { describe, expect, test, vi } from 'vitest';
import { auth } from '@internxt/lib';
import { randomInt, randomUUID } from 'node:crypto';
import { UserFixture } from '../fixtures/auth.fixture';
import { ValidationService } from '../../src/services/validation.service';

describe('Validation Service', () => {
  test('when an email address is invalid, then validation reports it as invalid', () => {
    vi.spyOn(auth, 'isValidEmail').mockReturnValue(false);
    const isValidEmail = ValidationService.instance.validateEmail(UserFixture.email);
    expect(isValidEmail).to.be.equal(false);
  });

  test('when a two-factor authentication code is validated, then it must be exactly six digits', () => {
    expect(ValidationService.instance.validate2FA('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validate2FA('loremi')).to.be.equal(false);
    expect(ValidationService.instance.validate2FA('123456')).to.be.equal(true);
  });

  test('when a version 4 UUID is validated, then it must follow the expected format', () => {
    expect(ValidationService.instance.validateUUIDv4('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('loremipsum')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('11111111-1111-1111-1111-111111111111')).to.be.equal(false);
    expect(ValidationService.instance.validateUUIDv4('BBBBBBBB-BBBB-4BBB-ABBB-BBBBBBBBBBBB')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4('22222222-2222-4222-8222-222222222222')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4('6cd6894a-2996-4729-8a4a-955d5a84c0c7')).to.be.equal(true);
    expect(ValidationService.instance.validateUUIDv4(randomUUID())).to.be.equal(true);
  });

  test('when a yes or no input is validated, then it accepts various affirmative and negative forms', () => {
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

  test('when a TCP port number is validated, then it must be between 1 and 65535', () => {
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

  test('when a string is checked for non-emptiness, then whitespace-only strings are rejected', () => {
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
    test('when the token is not provided, then null is returned', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration(undefined)).to.be.equal(null);
    });

    test('when the token is an empty string, then null is returned', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration('')).to.be.equal(null);
    });

    test('when the token does not have the expected format, then null is returned', () => {
      expect(ValidationService.instance.validateJwtAndCheckExpiration('invalid')).to.be.equal(null);
      expect(ValidationService.instance.validateJwtAndCheckExpiration('invalid.token')).to.be.equal(null);
    });

    test('when the token payload is not valid base64 encoding, then null is returned', () => {
      const invalidToken = 'header.!!!invalid_base64!!!.signature';
      expect(ValidationService.instance.validateJwtAndCheckExpiration(invalidToken)).to.be.equal(null);
    });

    test('when the token does not contain an expiration claim, then null is returned', () => {
      const payload = btoa(JSON.stringify({ sub: 'user123' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(null);
    });

    test('when the token expiration value is not a number, then null is returned', () => {
      const payload = btoa(JSON.stringify({ exp: 'not-a-number' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(null);
    });

    test('when the token has a valid structure with expiration, then the expiration timestamp is returned', () => {
      const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = btoa(JSON.stringify({ exp: expiration, sub: 'user123' }));
      const token = `header.${payload}.signature`;
      expect(ValidationService.instance.validateJwtAndCheckExpiration(token)).to.be.equal(expiration);
    });
  });

  describe('checkTokenExpiration', () => {
    test('when the token expired more than two days ago, then it is expired and cannot be refreshed', () => {
      const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(threeDaysAgo);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    test('when the token expired one second ago, then it is expired and cannot be refreshed', () => {
      const oneSecondAgo = Math.floor(Date.now() / 1000) - 1;
      const result = ValidationService.instance.checkTokenExpiration(oneSecondAgo);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    test('when the token expires at the current moment, then it is considered expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = ValidationService.instance.checkTokenExpiration(now);
      expect(result.expired).to.be.equal(true);
      expect(result.refreshRequired).to.be.equal(false);
    });

    test('when the token expires within one day, then it is not yet expired but requires refresh', () => {
      const oneDayFromNow = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(oneDayFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(true);
    });

    test('when the token expires in exactly two days, then it is not yet expired but requires refresh', () => {
      const twoDaysFromNow = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(twoDaysFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(true);
    });

    test('when the token expires in more than two days, then it is not expired and does not require refresh', () => {
      const twoDaysPlusOneSecond = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60 + 1;
      const result = ValidationService.instance.checkTokenExpiration(twoDaysPlusOneSecond);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(false);
    });

    test('when the token expires in thirty days, then it is not expired and does not require refresh', () => {
      const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const result = ValidationService.instance.checkTokenExpiration(thirtyDaysFromNow);
      expect(result.expired).to.be.equal(false);
      expect(result.refreshRequired).to.be.equal(false);
    });
  });

  describe('validateTokenAndCheckExpiration', () => {
    test('when the token is not provided, then it is invalid and marked as expired', () => {
      const result = ValidationService.instance.validateTokenAndCheckExpiration(undefined);
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    test('when the token is malformed, then it is invalid and marked as expired', () => {
      const result = ValidationService.instance.validateTokenAndCheckExpiration('invalid.token');
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    test('when the token is structurally valid but has expired, then it is marked as valid but expired', () => {
      const expiration = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = btoa(JSON.stringify({ exp: expiration }));
      const token = `header.${payload}.signature`;

      const result = ValidationService.instance.validateTokenAndCheckExpiration(token);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    test('when the token is valid and expires within one day, then it is valid and requires refresh', () => {
      const expiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 1 day from now
      const payload = btoa(JSON.stringify({ exp: expiration }));
      const token = `header.${payload}.signature`;

      const result = ValidationService.instance.validateTokenAndCheckExpiration(token);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
      expect(result.expiration.refreshRequired).to.be.equal(true);
    });

    test('when the token is valid and expires in thirty days, then it is valid with no action needed', () => {
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
