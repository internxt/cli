import { PromptOptions } from '../types/command.types';
import { confirm, input, password } from '@inquirer/prompts';

export class InquirerUtils {
  static async prompt(message: string, options: PromptOptions): Promise<string> {
    switch (options.type) {
      case 'password':
        return password({ message, mask: false });
      case 'mask':
        return password({ message, mask: true });
      case 'confirm':
        return this.transformConfirm(await confirm({ message, default: options.confirm?.default || false }));
      case 'input':
      default:
        return input({ message });
    }
  }

  static transformConfirm(value: boolean): string {
    return value ? 'y' : 'n';
  }
}
