import { ux } from '@oclif/core';

export class CLIUtils {
  static log(message: string) {
    ux.log(ux.colorize('green', message));
  }

  static warning(message: string) {
    ux.log(ux.colorize('#a67805', `⚠ Warning: ${message}`));
  }

  static error(message: string) {
    ux.log(ux.colorize('red', `⚠ Error: ${message}`));
  }

  static doing(message: string) {
    ux.action.start(message);
  }

  static success(message: string) {
    ux.log(ux.colorize('green', `✓ ${message}`));
  }

  static done() {
    ux.action.stop(ux.colorize('green', 'done ✓'));
  }
}
