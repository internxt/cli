import { Command } from '@oclif/core';

export default class Whoami extends Command {
  static args = {};
  static description = 'Displays the current user logged into the Internxt CLI.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    this.log('You are somebody');
  }
}
