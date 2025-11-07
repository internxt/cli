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

  describe('Token validation', () => {
    const createJWT = (payload: object): string => {
      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = btoa('fake-signature');
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    };

    const getCurrentTimeInSeconds = () => Math.floor(Date.now() / 1000);
    const oneDayInSeconds = 24 * 60 * 60;
    const threeDaysInSeconds = 3 * 24 * 60 * 60;

    it('should return result with isValid false when token is not a string', () => {
      const result = ValidationService.instance.validateTokenAndCheckExpiration(undefined);
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('should return result with isValid false when token does not have the proper jwt.token format', () => {
      const invalidToken = 'not.a.valid.jwt.token';
      const result = ValidationService.instance.validateTokenAndCheckExpiration(invalidToken);
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('should return result with isValid false when token payload expiration is not a number', () => {
      const tokenWithInvalidExp = createJWT({ exp: 'not-a-number' });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(tokenWithInvalidExp);
      expect(result.isValid).to.be.equal(false);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('should return result with isValid true when token is valid', () => {
      const futureExp = getCurrentTimeInSeconds();
      const validToken = createJWT({ exp: futureExp });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(validToken);
      expect(result.isValid).to.be.equal(true);
    });

    it('should return result with expiration.expired true when token is expired', () => {
      const pastExp = getCurrentTimeInSeconds();
      const expiredToken = createJWT({ exp: pastExp });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(expiredToken);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(true);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });

    it('should return result with expiration.expired false when token is not expired', () => {
      const futureExp = getCurrentTimeInSeconds() + threeDaysInSeconds;
      const validToken = createJWT({ exp: futureExp });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(validToken);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
    });

    it('should return result with refreshRequired true when token is about to expire in 2 days or less', () => {
      const expiresInOneDayExp = getCurrentTimeInSeconds() + oneDayInSeconds;
      const tokenExpiringSoon = createJWT({ exp: expiresInOneDayExp });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(tokenExpiringSoon);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
      expect(result.expiration.refreshRequired).to.be.equal(true);
    });

    it('should return object with refreshRequired false when token is not about to expire in 2 days', () => {
      const expiresInThreeDaysExp = getCurrentTimeInSeconds() + threeDaysInSeconds;
      const tokenNotExpiringSoon = createJWT({ exp: expiresInThreeDaysExp });
      const result = ValidationService.instance.validateTokenAndCheckExpiration(tokenNotExpiringSoon);
      expect(result.isValid).to.be.equal(true);
      expect(result.expiration.expired).to.be.equal(false);
      expect(result.expiration.refreshRequired).to.be.equal(false);
    });
  });
});
