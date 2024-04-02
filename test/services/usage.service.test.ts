import { expect } from 'chai';
import Sinon, { SinonSandbox } from 'sinon';
import { randomInt } from 'crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { Photos } from '@internxt/sdk/dist/photos';
import { UsageService } from '../../src/services/usage.service';
import { SdkManager } from '../../src/services/sdk-manager.service';
import PhotosSubmodule from '@internxt/sdk/dist/photos/photos';

describe('Usage Service', () => {
  let usageServiceSandbox: SinonSandbox;

  beforeEach(() => {
    usageServiceSandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    usageServiceSandbox.restore();
  });

  it('When getting user usage, it should return the total usage', async () => {
    const driveSpaceUsage = { total: randomInt(2000000000) };
    const photosSpaceUsage = { usage: randomInt(2000000000) };

    // @ts-expect-error - Partial mock
    usageServiceSandbox.stub(Storage.prototype, 'spaceUsage').resolves(driveSpaceUsage);
    usageServiceSandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const photos = new Photos('test');
    usageServiceSandbox.stub(PhotosSubmodule.prototype, 'getUsage').resolves(photosSpaceUsage);
    usageServiceSandbox.stub(photos, 'photos').returns(PhotosSubmodule.prototype);
    usageServiceSandbox.stub(SdkManager.instance, 'getPhotos').returns(photos);

    const result = await UsageService.instance.fetchTotalUsage();

    expect(result).to.be.equal(driveSpaceUsage.total + photosSpaceUsage.usage);
  });

  it('When getting user space limit, it should return the total usage', async () => {
    const driveSpaceLimit = { maxSpaceBytes: randomInt(5000000000) };

    usageServiceSandbox.stub(Storage.prototype, 'spaceLimit').resolves(driveSpaceLimit);
    usageServiceSandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const result = await UsageService.instance.fetchSpaceLimit();

    expect(result).to.be.equal(driveSpaceLimit.maxSpaceBytes);
  });
});
