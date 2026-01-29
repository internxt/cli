import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomInt, randomUUID } from 'node:crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { UsageService } from '../../src/services/usage.service';
import { SdkManager } from '../../src/services/sdk-manager.service';

describe('Usage Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When getting user usage, it should return the total usage', async () => {
    const drive = randomInt(2000000000);
    const backups = randomInt(2000000000);
    const total = drive + backups;
    const driveSpaceUsage = { _id: randomUUID(), total, drive, backups };

    vi.spyOn(Storage.prototype, 'spaceUsageV2').mockResolvedValue(driveSpaceUsage);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const result = await UsageService.instance.fetchUsage();

    expect(result).to.be.deep.equal(driveSpaceUsage.total);
  });

  it('When getting user space limit, it should return the total usage', async () => {
    const driveSpaceLimit = { maxSpaceBytes: randomInt(5000000000) };

    vi.spyOn(Storage.prototype, 'spaceLimitV2').mockResolvedValue(driveSpaceLimit);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const result = await UsageService.instance.fetchSpaceLimit();

    expect(result).to.be.equal(driveSpaceLimit.maxSpaceBytes);
  });
});
