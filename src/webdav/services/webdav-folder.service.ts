import { ConfigService } from '../../services/config.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { DriveFolderItem } from '../../types/drive.types';
import { ConflictError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { AsyncUtils } from '../../utils/async.utils';
import { AuthService } from '../../services/auth.service';
import { DriveUtils } from '../../utils/drive.utils';

export class WebDavFolderService {
  constructor(
    private readonly dependencies: {
      driveFolderService: DriveFolderService;
      configService: ConfigService;
    },
  ) {}

  public getDriveFolderItemFromPath = async (path: string): Promise<DriveFolderItem | undefined> => {
    const { url } = await WebDavUtils.getRequestedResource(path, false);
    return await WebDavUtils.getDriveFolderFromResource({
      url,
      driveFolderService: this.dependencies.driveFolderService,
    });
  };

  public createFolder = async ({
    folderName,
    parentFolderUuid,
  }: {
    folderName: string;
    parentFolderUuid: string;
  }): Promise<DriveFolderItem> => {
    const [createFolderPromise] = await this.dependencies.driveFolderService.createFolder({
      plainName: folderName,
      parentFolderUuid: parentFolderUuid,
    });

    const newFolder = await createFolderPromise;

    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);

    return DriveUtils.createFolderResponseToItem(newFolder);
  };

  public createParentPathOrThrow = async (parentPath: string): Promise<DriveFolderItem> => {
    const { createFullPath } = await this.dependencies.configService.readWebdavConfig();
    if (!createFullPath) {
      // WebDAV RFC: https://datatracker.ietf.org/doc/html/rfc4918#section-9.7.1
      // When the PUT operation creates a new resource,
      // all ancestors MUST already exist, or the method MUST fail
      // with a 409 (Conflict) status code
      throw new ConflictError(
        `Parent folders not found on Internxt Drive at ${WebDavUtils.decodeUrl(parentPath, false)},
        createFullPath flag is set to: ${createFullPath}`,
      );
    }
    const folders = parentPath.split('/').filter((f) => f.length > 0);
    const { user } = await AuthService.instance.getAuthDetails();
    return await this.createFolderRecursively(folders, user.rootFolderId);
  };

  private async createFolderRecursively(
    remainingFolders: string[],
    parentFolderUuid: string,
    accumulatedPath = '',
  ): Promise<DriveFolderItem> {
    const [currentFolderName, ...rest] = remainingFolders;

    const newPath = WebDavUtils.joinURL(accumulatedPath, currentFolderName);
    const folderPath = WebDavUtils.normalizeFolderPath(newPath);

    const folder =
      (await this.getDriveFolderItemFromPath(folderPath)) ??
      (await this.createFolder({ folderName: currentFolderName, parentFolderUuid }));

    if (rest.length === 0) {
      return folder;
    }

    return await this.createFolderRecursively(rest, folder.uuid, newPath);
  }
}
