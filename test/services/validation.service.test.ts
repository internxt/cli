import { expect } from 'chai';
import Sinon, { SinonSandbox } from 'sinon';
import { auth } from '@internxt/lib';
import { UserFixture } from '../fixtures/auth.fixture';
import { ValidationService } from '../../src/services/validation.service';

describe('Validation Service', () => {
  let validationServiceSandbox: SinonSandbox;

  beforeEach(() => {
    validationServiceSandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    validationServiceSandbox.restore();
  });

  it('When email is not valid, then validation service validates it as expected', async () => {
    validationServiceSandbox.stub(auth, 'isValidEmail').returns(false);
    const isValidEmail = ValidationService.instance.validateEmail(UserFixture.email);
    expect(isValidEmail).to.be.false;
  });

  it('When two factor auth code is validated, then validation service validates it as expected', async () => {
    expect(ValidationService.instance.validate2FA('1234567')).to.be.false;
    expect(ValidationService.instance.validate2FA('loremi')).to.be.false;
    expect(ValidationService.instance.validate2FA('123456')).to.be.true;
  });
});
