import { expect } from 'chai';
import Sinon, { SinonSandbox } from 'sinon';
import { randomInt, randomUUID } from 'crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { UsageService } from '../../src/services/usage.service';
import { SdkManager } from '../../src/services/sdk-manager.service';

describe('Usage Service', () => {
  let usageServiceSandbox: SinonSandbox;

  beforeEach(() => {
    usageServiceSandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    usageServiceSandbox.restore();
  });

  it('When getting user usage, it should return the total usage', async () => {
    const drive = randomInt(2000000000);
    const backups = randomInt(2000000000);
    const total = drive + backups;
    const driveSpaceUsage = { _id: randomUUID(), total, drive, backups };

    usageServiceSandbox.stub(Storage.prototype, 'spaceUsage').resolves(driveSpaceUsage);
    usageServiceSandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const result = await UsageService.instance.fetchUsage();

    expect(result).to.be.eql(driveSpaceUsage);
  });

  it('When getting user space limit, it should return the total usage', async () => {
    const driveSpaceLimit = { maxSpaceBytes: randomInt(5000000000) };

    usageServiceSandbox.stub(Storage.prototype, 'spaceLimit').resolves(driveSpaceLimit);
    usageServiceSandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const result = await UsageService.instance.fetchSpaceLimit();

    expect(result).to.be.equal(driveSpaceLimit.maxSpaceBytes);
  });
});
