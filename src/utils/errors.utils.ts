export class ErrorUtils {
  static report(error: unknown, props: Record<string, unknown> = {}) {
    if (error instanceof Error) {
      console.error(
        `[REPORTED_ERROR]: ${error.message}\nProperties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
      );
    } else {
      console.error(`[REPORTED_ERROR]: ${JSON.stringify(error)}\nProperties => ${JSON.stringify(props, null, 2)}\n`);
    }
  }
}
