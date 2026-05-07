// Shared pagination normalizer for different backend shapes
export function normalizePaginatedResponse(resp: any, itemsKey = 'results') {
  if (!resp) return { items: [], meta: {} };

  // AdminPagination-style merged response: top-level count/total_pages/current_page
  if (resp.count !== undefined || resp.total_pages !== undefined || resp.current_page !== undefined) {
    const items = resp[itemsKey] ?? resp.data ?? resp.results ?? [];
    return {
      items: Array.isArray(items) ? items : [],
      meta: {
        totalItems: resp.count ?? resp.total_items ?? null,
        totalPages: resp.total_pages ?? null,
        currentPage: resp.current_page ?? null,
        next: resp.next ?? null,
        previous: resp.previous ?? null,
      },
      raw: resp,
    };
  }

  // DRF-style with `results` wrapper
  if (resp.results !== undefined) {
    const pag = resp as any;
    const items = Array.isArray(pag.results) ? pag.results : (pag.results?.data ?? []);
    return {
      items,
      meta: {
        totalItems: pag.count ?? null,
        totalPages: Math.ceil((pag.count || 0) / (pag.page_size || pag.pageSize || 1)),
        currentPage: pag.current_page ?? pag.page ?? null,
        next: pag.next ?? null,
        previous: pag.previous ?? null,
      },
      raw: resp,
    };
  }

  // Nested legacy shape: { data: { results: [], pagination: {...} } } or { data: [...], pagination: {...} }
  const container = resp.data ?? resp;
  if (container?.pagination || container?.results || Array.isArray(container)) {
    const items = container.results ?? container.data ?? (Array.isArray(container) ? container : []);
    const p = container.pagination ?? {};
    return {
      items: Array.isArray(items) ? items : [],
      meta: {
        totalItems: p.total_items ?? p.count ?? null,
        totalPages: p.total_pages ?? null,
        currentPage: p.current_page ?? p.page ?? null,
        next: p.next ?? null,
        previous: p.previous ?? null,
      },
      raw: resp,
    };
  }

  // Non-paginated payload
  if (container?.students || container?.length) {
    const items = container.students ?? (Array.isArray(container) ? container : []);
    return { items, meta: { totalItems: items.length }, raw: resp };
  }

  return { items: [], meta: {}, raw: resp };
}
