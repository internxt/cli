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
    }) as Promise<T>;
  };
}
