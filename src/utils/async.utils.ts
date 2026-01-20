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
}
