declare global {
  namespace Express {
    interface Request {
      user: {
        rootFolderId: number;
        uuid: string;
      };
    }
  }
}

export {};
