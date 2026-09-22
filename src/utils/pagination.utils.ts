export class PaginationUtils {
  static readonly MAX_PAGE_SIZE = 1000;

  static readonly fetchAllPages = async <T>(
    fetchPage: (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>,
  ): Promise<T[]> => {
    const items: T[] = [];
    let cursor: string | undefined;
    do {
      const page = await fetchPage(cursor);
      if (!Array.isArray(page.items)) {
        throw new Error('Unusable page received from the API');
      }
      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return items;
  };
}
