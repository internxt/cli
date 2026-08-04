import { describe, expect, test, vi } from 'vitest';
import { auth, TokenStatus } from '@internxt/lib';
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

  test('when a UUID is validated, then it must follow the expected format regardless of its version', () => {
    expect(ValidationService.instance.validateUUID('1234567')).to.be.equal(false);
    expect(ValidationService.instance.validateUUID('loremipsum')).to.be.equal(false);
    expect(ValidationService.instance.validateUUID('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA')).to.be.equal(false);
    expect(ValidationService.instance.validateUUID('11111111-1111-1111-1111-111111111111')).to.be.equal(false);
    expect(ValidationService.instance.validateUUID('BBBBBBBB-BBBB-4BBB-ABBB-BBBBBBBBBBBB')).to.be.equal(true);
    expect(ValidationService.instance.validateUUID('22222222-2222-4222-8222-222222222222')).to.be.equal(true);
    expect(ValidationService.instance.validateUUID('6cd6894a-2996-4729-8a4a-955d5a84c0c7')).to.be.equal(true);
    expect(ValidationService.instance.validateUUID(randomUUID())).to.be.equal(true);
    // UUIDv7 (e.g. as issued by the backend for newly created files) must also be accepted
    expect(ValidationService.instance.validateUUID('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')).to.be.equal(true);
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

  describe('validateTokenAndCheckExpiration', () => {
    const nowInSeconds = () => Math.floor(Date.now() / 1000);
    const ONE_HOUR_IN_SECONDS = 60 * 60;
    // The library decodes the payload with Buffer.from(..., 'base64') which
    // handles both standard and URL-safe base64 after character substitution.
    const encodeSegment = (payload: object): string => Buffer.from(JSON.stringify(payload)).toString('base64');
    const createToken = (payload: object): string =>
      [encodeSegment({ alg: 'RS256', typ: 'JWT' }), encodeSegment(payload), 'signature'].join('.');

    test('when a token expires far in the future and most of its lifetime remains, then it is VALID', () => {
      const token = createToken({ exp: nowInSeconds() + 24 * ONE_HOUR_IN_SECONDS, iat: nowInSeconds() });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(token)).to.be.equal(TokenStatus.VALID);
    });

    test('when more than half of the token lifetime has elapsed, then it is REFRESH_REQUIRED', () => {
      const token = createToken({
        exp: nowInSeconds() + ONE_HOUR_IN_SECONDS,
        iat: nowInSeconds() - 2 * ONE_HOUR_IN_SECONDS,
      });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(token)).to.be.equal(
        TokenStatus.REFRESH_REQUIRED,
      );
    });

    test('when the expiration timestamp is in the past, then it is EXPIRED', () => {
      const token = createToken({
        exp: nowInSeconds() - ONE_HOUR_IN_SECONDS,
        iat: nowInSeconds() - 3 * ONE_HOUR_IN_SECONDS,
      });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(token)).to.be.equal(TokenStatus.EXPIRED);
    });

    test('when the token has no iat claim, then a fixed six-hour refresh margin applies', () => {
      const farFromExpiring = createToken({ exp: nowInSeconds() + 7 * ONE_HOUR_IN_SECONDS });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(farFromExpiring)).to.be.equal(
        TokenStatus.VALID,
      );

      const closeToExpiring = createToken({ exp: nowInSeconds() + 5 * ONE_HOUR_IN_SECONDS });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(closeToExpiring)).to.be.equal(
        TokenStatus.REFRESH_REQUIRED,
      );
    });

    test('when a token is malformed or unparseable, then it is INVALID', () => {
      expect(ValidationService.instance.validateTokenAndCheckExpiration('')).to.be.equal(TokenStatus.INVALID);
      expect(ValidationService.instance.validateTokenAndCheckExpiration('not-a-token')).to.be.equal(
        TokenStatus.INVALID,
      );
      expect(ValidationService.instance.validateTokenAndCheckExpiration('only.twosegments')).to.be.equal(
        TokenStatus.INVALID,
      );
      expect(
        ValidationService.instance.validateTokenAndCheckExpiration('header.!!!not-base64!!!.signature'),
      ).to.be.equal(TokenStatus.INVALID);
      const notJsonPayload = ['header', Buffer.from('plain text').toString('base64'), 'signature'].join('.');
      expect(ValidationService.instance.validateTokenAndCheckExpiration(notJsonPayload)).to.be.equal(
        TokenStatus.INVALID,
      );
    });

    test('when the payload has no numeric exp claim, then it is INVALID', () => {
      const missingExp = createToken({ iat: nowInSeconds() });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(missingExp)).to.be.equal(TokenStatus.INVALID);

      const nonNumericExp = createToken({ exp: 'tomorrow', iat: nowInSeconds() });
      expect(ValidationService.instance.validateTokenAndCheckExpiration(nonNumericExp)).to.be.equal(
        TokenStatus.INVALID,
      );
    });

    test('when the payload encoding contains base64url-specific characters, then it is correctly decoded', () => {
      const base64UrlToken =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDAsImlhdCI6MTU3NzgzNjgwMCwic3ViIjoiw7_DvsO9In0.signature';
      expect(ValidationService.instance.validateTokenAndCheckExpiration(base64UrlToken)).to.be.equal(TokenStatus.VALID);
    });
  });
});
