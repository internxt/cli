import path from 'path';

export class PathUtils {
  static getPathFileData(filePath: string): { folderPath: string; fileName: string; fileType: string | null } {
    const folderPath = path.dirname(filePath);
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath, fileExt);

    const fileExtWithoutDot = fileExt.replace('.', '').trim();
    const fileType = fileExtWithoutDot.length > 0 ? fileExtWithoutDot : null;
    return { folderPath, fileName, fileType };
  }
}
