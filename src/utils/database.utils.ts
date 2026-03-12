export class DatabaseUtils {
  public static readonly CREATE_BATCH_SIZE = 100;

  public static readonly getFolderByPathGeneric = async <T>({
    path,
    parentUuid,
    onFound,
    getByParentAndName,
  }: {
    path: string;
    parentUuid: string;
    onFound: (uuid: string) => Promise<T>;
    getByParentAndName: (parentUuid: string, name: string) => Promise<{ uuid: string } | null | undefined>;
  }): Promise<T | undefined> => {
    // Remove leading/trailing slashes
    path = path.replace(/^\//, '').replace(/\/$/, '');

    // Base case: If the path is empty, return the folder's found uuid
    if (path.trim().length === 0) {
      return onFound(parentUuid);
    }

    // Get the next folder name and the remaining path
    const slashIndex = path.indexOf('/');
    const currentFolder = slashIndex === -1 ? path : path.substring(0, slashIndex);
    const nextPath = slashIndex === -1 ? '' : path.substring(slashIndex + 1);

    const folder = await getByParentAndName(parentUuid, currentFolder);

    if (!folder) {
      return;
    }

    return this.getFolderByPathGeneric({
      path: nextPath,
      parentUuid: folder.uuid,
      onFound,
      getByParentAndName,
    });
  };
}
