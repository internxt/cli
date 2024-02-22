import { Command, Flags, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveService } from '../services/drive/drive.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderIdError } from '../types/command.types';

export default class List extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of a folder id.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    'folder-id': Flags.string({
      char: 'f',
      description: 'The folder id to list. Leave empty for the root folder.',
      required: false,
      parse: async (input: string) => (input.trim().length === 0 ? ' ' : input),
    }),
  };

  static readonly enableJsonFlag = true;

  public async run(): Promise<void> {
    const { flags } = await this.parse(List);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();
    const root_folder_id = userCredentials.user.root_folder_id;

    let folderId = Number(await this.getFolderId(flags['folder-id'], nonInteractive));

    if (folderId === 0) {
      // folderId is empty from flags/prompt
      folderId = root_folder_id;
    }

    const { children, files, name } = await DriveService.instance.getFolderContent(folderId);

    const tree = ux.tree();
    const folderParent = `🗁  ${folderId === root_folder_id ? 'Root Folder' : name}`;
    tree.insert(folderParent);

    for (const folder of children) {
      const subFolder = `🗁  ${folder.plain_name}: [${folder.uuid}]`;

      tree.nodes[folderParent].insert(subFolder);
    }

    for (const file of files) {
      const subFile = `🗎 ${file.plain_name}: [${file.uuid}]`;

      tree.nodes[folderParent].insert(subFile);
    }
    tree.display();
  }

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFolderId = async (folderIdFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let folderId = CLIUtils.getValueFromFlag(
      {
        value: folderIdFlag,
        name: List.flags['folder-id'].name,
        error: new NotValidFolderIdError(),
      },
      nonInteractive,
      (folderId: string) => !isNaN(Number(folderId)),
    );
    if (!folderId) {
      folderId = (await this.getFolderIdInteractively()).trim();
    }
    return folderId;
  };

  public getFolderIdInteractively = (): Promise<string> => {
    return CLIUtils.prompt({
      message: 'What is the folder id you want to list? (leave empty for the root folder)',
      options: { required: false },
      error: new NotValidFolderIdError(),
    });
  };
}
