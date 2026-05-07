import { useMemo, useState, useEffect } from 'react';

type PaginationResult<T> = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  current: T[];
  next: () => void;
  prev: () => void;
  goTo: (p: number) => void;
  showPagination: boolean;
};

export default function useClientPagination<T>(items: T[] | undefined | null, pageSize = 10): PaginationResult<T> {
  const [page, setPage] = useState(1);

  const totalItems = (items || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  useEffect(() => {
    // reset page when items change significantly
    setPage(1);
  }, [JSON.stringify(items)]);

  const current = useMemo(() => {
    if (!items || items.length === 0) return [] as T[];
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    current,
    next: () => setPage(p => Math.min(totalPages, p + 1)),
    prev: () => setPage(p => Math.max(1, p - 1)),
    goTo: (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
    showPagination: totalItems > pageSize,
  };
}
