import { Command, Flags, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class List extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of a folder id.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    'folder-uuid': Flags.string({
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

    let folderUuid = await this.getFolderUuid(flags['folder-uuid'], nonInteractive);
    let parentFolderName = '';

    if (folderUuid.trim().length === 0) {
      // folderId is empty from flags/prompt, which means we should use RootFolderUuid
      parentFolderName = 'Root Folder';
      const rootFolderId = userCredentials.user.root_folder_id;
      const rootFolderMeta = await DriveFolderService.instance.getFolderMetaById(rootFolderId);
      this.logJson({ rootFolderMeta });
      folderUuid = rootFolderMeta.uuid;
    } else {
      const folderMeta = await DriveFolderService.instance.getFolderMetaByUuid(folderUuid);
      parentFolderName = folderMeta.plainName;
    }

    const { folders, files } = await DriveFolderService.instance.getFolderContent(folderUuid);

    const tree = ux.tree();
    const folderParent = `🗁  ${parentFolderName}`;
    tree.insert(folderParent);

    for (const folder of folders) {
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

  public getFolderUuid = async (folderIdFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let folderUuid = CLIUtils.getValueFromFlag(
      {
        value: folderIdFlag,
        name: List.flags['folder-uuid'].name,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (folderUuid: string) => ValidationService.instance.validateUUIDv4(folderUuid),
    );
    if (!folderUuid) {
      folderUuid = (await this.getFolderUuidInteractively()).trim();
    }
    return folderUuid;
  };

  public getFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.prompt({
      message: 'What is the folder uuid you want to list? (leave empty for the root folder)',
      options: { required: false },
      error: new NotValidFolderUuidError(),
    });
  };
}
