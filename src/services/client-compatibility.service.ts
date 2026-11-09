import fs from 'node:fs/promises';
import axios from 'axios';
import { basicHeaders } from '@internxt/sdk/dist/shared/headers';
import { CLIENT_COMPATIBILITY_CACHE_FILE } from '../constants/configs';
import { ConfigService } from './config.service';
import { SdkManager } from './sdk-manager.service';
import { UpdateUtils } from '../utils/update.utils';
import { ClientVersionUnsupportedError } from '../utils/errors.utils';

const STATUSES = ['up_to_date', 'update_recommended', 'deprecated', 'unsupported'] as const;
type ClientCompatibilityStatus = (typeof STATUSES)[number];

export interface ClientCompatibility {
  status: ClientCompatibilityStatus;
  message?: string;
  recommendedVersion?: string;
  sunsetAt?: string;
}

export interface CompatibilityVerdict {
  blockError?: ClientVersionUnsupportedError;
  warning?: string;
}

interface CompatibilityCache {
  clientVersion: string;
  apiUrl: string;
  checkedAt: number;
  compatibility?: ClientCompatibility;
  recommendedWarnedAt?: number;
}

export const COMPATIBILITY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const COMPATIBILITY_REQUEST_TIMEOUT_MS = 2000;
export const UPDATE_RECOMMENDED_WARNING_INTERVAL_MS = 60 * 60 * 1000;

export class ClientCompatibilityService {
  public static readonly instance: ClientCompatibilityService = new ClientCompatibilityService();

  public evaluate = async (): Promise<CompatibilityVerdict> => {
    if (ClientCompatibilityService.isCheckSkipped()) return {};

    const now = Date.now();
    let cache = await this.readCache();
    let changed = false;
    // An unsupported version never becomes supported again, so that verdict is never re-fetched
    const expired =
      cache?.compatibility?.status !== 'unsupported' && now - (cache?.checkedAt ?? 0) >= COMPATIBILITY_CACHE_TTL_MS;
    if (!cache || expired) {
      cache = {
        clientVersion: UpdateUtils.getCurrentVersion(),
        apiUrl: this.getApiUrl(),
        checkedAt: now,
        compatibility: (await this.fetchCompatibility()) ?? cache?.compatibility,
        recommendedWarnedAt: cache?.recommendedWarnedAt,
      };
      changed = true;
    }

    const verdict: CompatibilityVerdict = {};
    const compatibility = cache.compatibility;
    if (compatibility?.status === 'unsupported') {
      verdict.blockError = new ClientVersionUnsupportedError(compatibility.message, compatibility.recommendedVersion);
    } else if (compatibility?.status === 'deprecated') {
      verdict.warning = UpdateUtils.getOutdatedWarning(compatibility);
    } else if (
      compatibility?.status === 'update_recommended' &&
      now - (cache.recommendedWarnedAt ?? 0) >= UPDATE_RECOMMENDED_WARNING_INTERVAL_MS
    ) {
      verdict.warning = UpdateUtils.getOutdatedWarning(compatibility);
      cache.recommendedWarnedAt = now;
      changed = true;
    }

    if (changed) await this.writeCache(cache);
    return verdict;
  };

  private static readonly isCheckSkipped = (): boolean => {
    const value = process.env.INXT_SKIP_VERSION_CHECK?.trim().toLowerCase();
    return !!value && value !== '0' && value !== 'false';
  };

  private readonly getApiUrl = () => ConfigService.instance.get('DRIVE_NEW_API_URL', false);

  private readonly fetchCompatibility = async (): Promise<ClientCompatibility | undefined> => {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return undefined;

    try {
      const { clientName, clientVersion, desktopHeader } = SdkManager.getAppDetails();
      const response = await axios.get(`${apiUrl}/clients/compatibility`, {
        headers: basicHeaders({ clientName, clientVersion, desktopToken: desktopHeader }),
        timeout: COMPATIBILITY_REQUEST_TIMEOUT_MS,
      });
      return ClientCompatibilityService.parseCompatibility(response.data);
    } catch {
      return undefined;
    }
  };

  private static readonly parseCompatibility = (data: unknown): ClientCompatibility | undefined => {
    if (typeof data !== 'object' || data === null) return undefined;
    const body = data as Record<string, unknown>;
    if (!STATUSES.includes(body.status as ClientCompatibilityStatus)) return undefined;

    const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
    return {
      status: body.status as ClientCompatibilityStatus,
      message: optionalString(body.message),
      recommendedVersion: optionalString(body.recommendedVersion),
      sunsetAt: optionalString(body.sunsetAt),
    };
  };

  private readonly readCache = async (): Promise<CompatibilityCache | undefined> => {
    try {
      const cache = JSON.parse(await fs.readFile(CLIENT_COMPATIBILITY_CACHE_FILE, 'utf8')) as CompatibilityCache;
      if (cache.clientVersion !== UpdateUtils.getCurrentVersion() || cache.apiUrl !== this.getApiUrl()) {
        return undefined;
      }
      return { ...cache, compatibility: ClientCompatibilityService.parseCompatibility(cache.compatibility) };
    } catch {
      return undefined;
    }
  };

  private readonly writeCache = async (cache: CompatibilityCache) => {
    try {
      await ConfigService.instance.ensureInternxtCliDataDirExists();
      await fs.writeFile(CLIENT_COMPATIBILITY_CACHE_FILE, JSON.stringify(cache), 'utf8');
    } catch {
      // The cache is an optimisation only; a torn write just reads as no cache
    }
  };
}
