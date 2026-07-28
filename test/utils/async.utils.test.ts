import { describe, expect, test } from 'vitest';
import { AsyncUtils } from '../../src/utils/async.utils';

describe('Async utils', () => {
  describe('mapWithConcurrency', () => {
    test('when items are mapped, then results preserve the original order', async () => {
      const items = [1, 2, 3, 4, 5];

      const results = await AsyncUtils.mapWithConcurrency(items, 2, async (item) => {
        await AsyncUtils.sleep(item % 2 === 0 ? 1 : 10);
        return item * 2;
      });

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('when the limit is lower than the amount of items, then no more than "limit" run at the same time', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const limit = 3;
      let inFlight = 0;
      let maxInFlight = 0;

      await AsyncUtils.mapWithConcurrency(items, limit, async (item) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await AsyncUtils.sleep(5);
        inFlight--;
        return item;
      });

      expect(maxInFlight).toBe(limit);
    });

    test('when the limit is higher than the amount of items, then all items run concurrently', async () => {
      const items = Array.from({ length: 3 }, (_, i) => i);
      let inFlight = 0;
      let maxInFlight = 0;

      await AsyncUtils.mapWithConcurrency(items, 100, async (item) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await AsyncUtils.sleep(5);
        inFlight--;
        return item;
      });

      expect(maxInFlight).toBe(items.length);
    });

    test('when the items array is empty, then it resolves to an empty array without calling the mapper', async () => {
      let callCount = 0;

      const results = await AsyncUtils.mapWithConcurrency([], 5, async (item) => {
        callCount++;
        return item;
      });

      expect(results).toEqual([]);
      expect(callCount).toBe(0);
    });

    test('when the mapper is called, then it receives the correct item and index', async () => {
      const items = ['a', 'b', 'c'];
      const calls: Array<[string, number]> = [];

      await AsyncUtils.mapWithConcurrency(items, 2, async (item, index) => {
        calls.push([item, index]);
        return item;
      });

      expect(calls.sort((a, b) => a[1] - b[1])).toEqual([
        ['a', 0],
        ['b', 1],
        ['c', 2],
      ]);
    });

    test('when a mapper call rejects, then mapWithConcurrency rejects with the same error', async () => {
      const items = [1, 2, 3];
      const error = new Error('mapper failed');

      await expect(
        AsyncUtils.mapWithConcurrency(items, 2, async (item) => {
          if (item === 2) throw error;
          return item;
        }),
      ).rejects.toThrow(error);
    });
  });
});
