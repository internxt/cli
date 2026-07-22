import { beforeEach, vi } from 'vitest';
import { WebDavCacheService } from '../src/services/webdav/webdav-cache.service';

vi.mock('../src/utils/logger.utils', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  webdavLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeEach(() => {
  WebDavCacheService.instance.clear();
});
