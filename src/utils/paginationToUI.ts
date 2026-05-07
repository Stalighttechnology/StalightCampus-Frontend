import { normalizePaginatedResponse } from './normalizePagination';

export function paginationToUI(resp: any, items: any[] = [], defaultPageSize = 10) {
  const normalized = normalizePaginatedResponse(resp, 'data');
  const meta = normalized.meta || {};

  const page = meta.currentPage ?? resp?.current_page ?? resp?.page ?? 1;
  const page_size = resp?.page_size ?? resp?.pageSize ?? meta.pageSize ?? defaultPageSize;
  const total_items = meta.totalItems ?? resp?.count ?? resp?.total_items ?? (Array.isArray(items) ? items.length : 0);
  const total_pages = meta.totalPages ?? resp?.total_pages ?? Math.max(1, Math.ceil((total_items || 0) / (page_size || 1)));
  const count = resp?.count ?? total_items;

  return {
    page,
    page_size,
    total_items,
    total_pages,
    count,
    current_page: page,
    pageSize: page_size,
    next: meta.next ?? resp?.next ?? null,
    previous: meta.previous ?? resp?.previous ?? null,
  };
}

export default paginationToUI;
