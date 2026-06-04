const FIFTEEN_MINUTES = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  public static readonly instance: CacheService = new CacheService();
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl = FIFTEEN_MINUTES;

  public static readonly FETCH_USAGE_CACHE_KEY = 'usage:fetchUsage';
  public static readonly FETCH_SPACE_LIMIT_CACHE_KEY = 'usage:fetchSpaceLimit';
  public static readonly FETCH_LIMITS_CACHE_KEY = 'usage:fetchLimits';
  public static readonly AUTH_CACHE_KEY = 'auth:details';

  public get = <T>(key: string): T | null => {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  };

  public set = <T>(key: string, data: T, ttl?: number): void => {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
  };

  public clearCaches = (): void => {
    this.store.clear();
  };
}
