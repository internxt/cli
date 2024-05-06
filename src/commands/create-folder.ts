import { Command, Flags } from '@oclif/core';
import { AuthService } from '../services/auth.service';
import { ErrorUtils } from '../utils/errors.utils';
import { CLIUtils } from '../utils/cli.utils';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { ConfigService } from '../services/config.service';
import { DriveFolderItem } from '../types/drive.types';

export default class CreateFolder extends Command {
  static description = 'Create a folder in your Internxt Drive';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    name: Flags.string({ description: 'The new folder name', required: true }),
    id: Flags.string({
      description: 'The folder id to create the folder in, defaults to your root folder',
      required: false,
    }),
  };

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  getParentFolder(uuid: string) {
    return DriveFolderService.instance.getFolderMetaByUuid(uuid);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(CreateFolder);

    const folderName = flags.name;

    const user = await AuthService.instance.getUser();
    let parentFolder: DriveFolderItem | undefined;
    if (flags.id) {
      parentFolder = await this.getParentFolder(flags.id);
      if (!parentFolder) {
        throw new Error(`Folder with id ${flags.id} not found`);
      }
    }

    CLIUtils.doing('Creating folder...');
    const [createNewFolder, requestCanceler] = DriveFolderService.instance.createFolder({
      folderName,
      parentFolderId: parentFolder ? parentFolder.id : user.root_folder_id,
    });

    process.on('SIGINT', () => {
      requestCanceler.cancel('SIGINT received');
      process.exit(1);
    });

    const newFolder = await createNewFolder;
    CLIUtils.done();
    CLIUtils.success(
      `Folder ${newFolder.plain_name} created successfully, view it at view it at ${ConfigService.instance.get('DRIVE_URL')}/folder/${newFolder.uuid}`,
    );
  }
}
