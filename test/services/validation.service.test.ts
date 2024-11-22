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
});
