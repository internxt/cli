export class AsyncUtils {
  /**
   * A function that pauses the execution for a specified amount of time.
   *
   * @param {number} ms - The number of milliseconds to pause the execution.
   * @return {Promise<void>} A promise that resolves once the specified time has elapsed.
   */
  static readonly sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Maps an array with a bounded number of concurrent in-flight operations,
   * preserving the original order of the results.
   *
   * @param {T[]} items - The items to map over.
   * @param {number} limit - The maximum number of operations running at the same time.
   * @param {(item: T, index: number) => Promise<R>} mapper - The async operation to run for each item.
   * @return {Promise<R[]>} A promise that resolves to the mapped results, in the same order as `items`.
   */
  static readonly mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);

    return results;
  };

  static readonly withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out',
  ): Promise<T> => {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  };
}
