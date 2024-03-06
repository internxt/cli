declare global {
  namespace Express {
    interface Request {
      user: {
        rootFolderId: number;
      };
    }
  }
}

export {};
