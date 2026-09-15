import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

const API_BASE = `${API_ENDPOINT}/inventory`;

const authHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

export interface InventoryCategory {
  id: number;
  name: string;
  prefix: string;
  description?: string;
  is_active: boolean;
  items_count?: number;
  created_at: string;
}

export interface InventoryLocation {
  id: number;
  name: string;
  prefix: string;
  building?: string;
  is_active: boolean;
  items_count?: number;
  created_at: string;
}

export interface InventoryHistoryLog {
  id: number | string;
  inventory?: number;
  item_code?: string;
  action_type: string;
  action_title?: string;
  count?: number;
  unit_codes?: string[];
  code_range?: string;
  destination_branch?: string;
  destination_location?: string;
  rooms?: string[];
  rooms_display?: string;
  received_by?: string;
  recipient_role?: string;
  old_value?: any;
  new_value?: any;
  changed_by?: number;
  changed_by_name: string;
  changed_by_email?: string;
  change_reason?: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  sl_no: number;
  item_code: string;
  item_name: string;
  specifications?: string;
  category: number;
  category_details?: InventoryCategory;
  location: number;
  location_details?: InventoryLocation;
  branch?: number;
  branch_name?: string;
  room_no?: string;
  quantity_available: number;
  cost_per_unit: string | number;
  total_cost: string | number;
  asset_type: 'tangible' | 'consumable' | 'license' | 'it_asset' | 'furniture' | 'lab_equipment' | 'other';
  status: 'in-use' | 'available' | 'in-repair' | 'discarded' | 'scrapped' | 'transferred';
  vendor_name?: string;
  vendor_address?: string;
  vendor_contact?: string;
  invoice_no?: string;
  invoice_date?: string;
  approval_letter_ref?: string;
  approval_letter_date?: string;
  item_photo_url?: string;
  invoice_photo_url?: string;
  approval_letter_photo_url?: string;
  qr_code_url?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  remarks?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRequest {
  id: number;
  request_no: string;
  title: string;
  description: string;
  category: number;
  category_details?: InventoryCategory;
  branch?: number;
  branch_name?: string;
  requested_quantity: number;
  estimated_cost: string | number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'pending_hod' | 'pending_principal' | 'approved' | 'rejected' | 'rfq_issued' | 'ordered' | 'delivered' | 'added_to_inventory';
  requested_by: number;
  requested_by_name: string;
  hod_endorsed_by?: number;
  hod_endorsed_by_name?: string;
  hod_endorsement_remarks?: string;
  principal_sanctioned_by?: number;
  principal_sanctioned_by_name?: string;
  principal_sanction_remarks?: string;
  selected_vendor?: {
    vendor_name: string;
    vendor_email?: string;
    vendor_phone?: string;
    total_amount?: string | number;
    quote_document_url?: string;
    description?: string;
    status?: string;
  } | null;
  final_price?: string | number | null;
  quotations_summary?: Array<{
    id: number;
    company_email: string;
    status: string;
    product_name: string;
    quantity: number;
    last_reply_date?: string;
    created_at: string;
    responses: QuotationResponse[];
  }>;
  created_at: string;
  updated_at: string;
}

export interface QuotationResponse {
  id: number;
  quotation: number;
  vendor_name: string;
  vendor_email: string;
  vendor_phone?: string;
  description: string;
  total_amount: string | number;
  quote_document_url?: string;
  submitted_at: string;
}

export interface InventoryQuotation {
  id: number;
  procurement_request?: number;
  procurement_request_details?: {
    id: number;
    request_no: string;
    title: string;
    requested_quantity: number;
    estimated_cost: number;
    branch_name?: string;
    category_name?: string;
    status: string;
  };
  category: number;
  category_details?: InventoryCategory;
  product_name: string;
  description: string;
  quantity: number;
  company_email: string;
  last_reply_date?: string;
  access_token: string;
  status: 'sent' | 'responded' | 'accepted' | 'rejected' | 'expired';
  responses: QuotationResponse[];
  responses_count: number;
  public_url: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface TicketUpdate {
  id: number;
  ticket: number;
  status_from?: string;
  status_to?: string;
  notes: string;
  updated_by_name: string;
  attachment_url?: string;
  created_at: string;
}

export interface InventoryTicket {
  id: number;
  ticket_number: string;
  inventory_item?: number;
  item_code?: string;
  item_name?: string;
  reported_by: number;
  reported_by_name: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_contact?: string;
  department?: number;
  department_name?: string;
  room_no?: string;
  issue_category: string;
  issue_description: string;
  attachment_url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'waiting_for_user' | 'procure_in_progress' | 'resolved' | 'closed';
  assigned_to?: number;
  assigned_to_name?: string;
  sla_due_date?: string;
  resolved_at?: string;
  resolution_notes?: string;
  updates?: TicketUpdate[];
  created_at: string;
  updated_at: string;
}

export interface InventoryAnalyticsData {
  kpis: {
    total_items: number;
    total_valuation: number;
    in_repair_count: number;
    scrapped_count: number;
    active_tickets: number;
    pending_procurements: number;
  };
  by_category: Array<{ category__id: number; category__name: string; category__prefix: string; count: number; total_value: number }>;
  by_location: Array<{ location__id: number; location__name: string; location__prefix: string; count: number; total_value: number }>;
  by_status: Array<{ status: string; count: number }>;
  recent_activity: InventoryHistoryLog[];
}

// ─── API CLIENT FUNCTIONS ──────────────────────────────────────────

async function handleJsonResponse<T>(resPromise: Promise<Response>, isList = false): Promise<T> {
  const r = await resPromise;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const errorMsg = data.detail || data.error || data.message || `Request failed with status ${r.status}`;
    throw new Error(errorMsg);
  }
  if (isList) {
    if (Array.isArray(data)) return data as T;
    if (data && Array.isArray(data.results)) return data.results as T;
    return [] as unknown as T;
  }
  return data as T;
}

// Analytics
export const fetchInventoryAnalytics = (): Promise<InventoryAnalyticsData> =>
  handleJsonResponse<InventoryAnalyticsData>(
    fetchWithTokenRefresh(`${API_BASE}/analytics/`, { headers: authHeaders() })
  );

// Branches / Departments (Cached to prevent redundant calls)
let branchesCachePromise: Promise<Array<{ id: number; name: string; code?: string }>> | null = null;
export const fetchBranches = (forceRefresh = false): Promise<Array<{ id: number; name: string; code?: string }>> => {
  if (!branchesCachePromise || forceRefresh) {
    branchesCachePromise = handleJsonResponse<Array<{ id: number; name: string; code?: string }>>(
      fetchWithTokenRefresh(`${API_BASE}/branches/`, { headers: authHeaders() }),
      true
    ).catch((err) => {
      branchesCachePromise = null;
      throw err;
    });
  }
  return branchesCachePromise;
};


// Locations (Cached to prevent duplicate network calls)
let locationsCachePromise: Promise<InventoryLocation[]> | null = null;
export const fetchInventoryLocations = (forceRefresh = false): Promise<InventoryLocation[]> => {
  if (!locationsCachePromise || forceRefresh) {
    locationsCachePromise = handleJsonResponse<any>(
      fetchWithTokenRefresh(`${API_BASE}/locations/?all=true`, { headers: authHeaders() }),
      true
    )
      .then((res) => (Array.isArray(res) ? res : res?.results || []))
      .catch((err) => {
        locationsCachePromise = null;
        throw err;
      });
  }
  return locationsCachePromise;
};

export const fetchInventoryLocationsPaginated = async (
  params?: Record<string, any>
): Promise<PaginatedInventoryResponse<InventoryLocation>> => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
  }
  const url = `${API_BASE}/locations/${query.toString() ? `?${query.toString()}` : ""}`;
  return handleJsonResponse<PaginatedInventoryResponse<InventoryLocation>>(
    fetchWithTokenRefresh(url, { headers: authHeaders() }),
    true
  );
};

export const clearLocationsCache = () => {
  locationsCachePromise = null;
};

export const createInventoryLocation = (data: Partial<InventoryLocation>): Promise<InventoryLocation> => {
  clearLocationsCache();
  return handleJsonResponse<InventoryLocation>(
    fetchWithTokenRefresh(`${API_BASE}/locations/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );
};

export const updateInventoryLocation = (id: number, data: Partial<InventoryLocation>): Promise<InventoryLocation> => {
  clearLocationsCache();
  return handleJsonResponse<InventoryLocation>(
    fetchWithTokenRefresh(`${API_BASE}/locations/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );
};

export const deleteInventoryLocation = (id: number): Promise<any> => {
  clearLocationsCache();
  return handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/locations/${id}/`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  );
};

// Categories (Cached to prevent duplicate network calls)
let categoriesCachePromise: Promise<InventoryCategory[]> | null = null;
export const fetchInventoryCategories = (forceRefresh = false): Promise<InventoryCategory[]> => {
  if (!categoriesCachePromise || forceRefresh) {
    categoriesCachePromise = handleJsonResponse<any>(
      fetchWithTokenRefresh(`${API_BASE}/categories/?all=true`, { headers: authHeaders() }),
      true
    )
      .then((res) => (Array.isArray(res) ? res : res?.results || []))
      .catch((err) => {
        categoriesCachePromise = null;
        throw err;
      });
  }
  return categoriesCachePromise;
};

export const fetchInventoryCategoriesPaginated = async (
  params?: Record<string, any>
): Promise<PaginatedInventoryResponse<InventoryCategory>> => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
  }
  const url = `${API_BASE}/categories/${query.toString() ? `?${query.toString()}` : ""}`;
  return handleJsonResponse<PaginatedInventoryResponse<InventoryCategory>>(
    fetchWithTokenRefresh(url, { headers: authHeaders() }),
    true
  );
};

export const clearCategoriesCache = () => {
  categoriesCachePromise = null;
};

export const createInventoryCategory = (data: Partial<InventoryCategory>): Promise<InventoryCategory> => {
  clearCategoriesCache();
  return handleJsonResponse<InventoryCategory>(
    fetchWithTokenRefresh(`${API_BASE}/categories/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );
};

export const updateInventoryCategory = (id: number, data: Partial<InventoryCategory>): Promise<InventoryCategory> => {
  clearCategoriesCache();
  return handleJsonResponse<InventoryCategory>(
    fetchWithTokenRefresh(`${API_BASE}/categories/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );
};

export const deleteInventoryCategory = (id: number): Promise<any> => {
  clearCategoriesCache();
  return handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/categories/${id}/`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  );
};

export interface PaginatedInventoryResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Items
export const fetchInventoryItems = (params: Record<string, string | number> = {}): Promise<InventoryItem[]> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
  });
  return handleJsonResponse<InventoryItem[]>(
    fetchWithTokenRefresh(`${API_BASE}/items/?${query.toString()}`, { headers: authHeaders() }),
    true
  );
};

export interface GroupedInventoryDeployment {
  department: string;
  branch_id?: number | null;
  location_name?: string;
  room: string;
  rooms?: string[];
  rooms_display?: string;
  status: string;
  count: number;
  received_by?: string;
  recipient_role?: string;
  handed_over_by?: string;
  allocated_date?: string;
  unit_codes: string[];
  code_range?: string;
}

export interface GroupedInventoryAsset {
  group_id: string;
  item_name: string;
  clean_name: string;
  specifications?: string;
  category_id: number;
  category_name: string;
  category_prefix: string;
  location_name: string;
  location_id: number;
  vendor_name?: string;
  cost_per_unit: number;
  total_valuation: number;
  total_units: number;
  in_stock_buffer: number;
  in_use_deployed: number;
  in_repair: number;
  scrapped: number;
  sample_item_id?: number;
  sample_item?: InventoryItem;
  deployments?: GroupedInventoryDeployment[];
  history_logs?: InventoryHistoryLog[];
  unit_codes?: string[];
  code_range?: string;
  transfers_count?: number;
  items?: Array<{
    id: number;
    item_code: string;
    item_name: string;
    specifications?: string;
    status: string;
    branch_id?: number | null;
    branch_name?: string | null;
    location_id?: number;
    location_details?: { id: number; name: string; prefix: string };
    category_details?: { id: number; name: string; prefix: string };
    room_no?: string;
    quantity_available: number;
    cost_per_unit: number;
    total_cost: number;
    vendor_name?: string;
    remarks?: string;
    received_by?: string;
    recipient_role?: string;
    handed_over_by?: string;
    allocated_date?: string;
    created_at?: string;
  }>;
}

// Grouped Assets API
export const fetchInventoryGroupedAssets = (
  params: Record<string, string | number> = {}
): Promise<PaginatedInventoryResponse<GroupedInventoryAsset>> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
  });
  return handleJsonResponse<PaginatedInventoryResponse<GroupedInventoryAsset>>(
    fetchWithTokenRefresh(`${API_BASE}/items/grouped/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const fetchGroupedAssetDetails = (
  params: {
    item_name?: string;
    category_id?: number;
    sample_item_id?: number;
    tab?: "summary" | "ledger" | "transfers" | "units" | "specs" | "all" | string;
  }
): Promise<GroupedInventoryAsset & { history_logs?: any[]; items?: any[]; total_transfers?: number }> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
  });
  return handleJsonResponse<GroupedInventoryAsset & { history_logs?: any[]; items?: any[]; total_transfers?: number }>(
    fetchWithTokenRefresh(`${API_BASE}/items/grouped_detail/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const fetchInventoryItemsPaginated = (params: Record<string, string | number> = {}): Promise<PaginatedInventoryResponse<InventoryItem>> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
  });
  return handleJsonResponse<PaginatedInventoryResponse<InventoryItem>>(
    fetchWithTokenRefresh(`${API_BASE}/items/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const fetchInventoryItem = (id: number): Promise<InventoryItem> =>
  handleJsonResponse<InventoryItem>(
    fetchWithTokenRefresh(`${API_BASE}/items/${id}/`, { headers: authHeaders() })
  );

export const createInventoryItem = (data: any): Promise<InventoryItem> =>
  handleJsonResponse<InventoryItem>(
    fetchWithTokenRefresh(`${API_BASE}/items/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const updateInventoryItem = (id: number, data: any): Promise<InventoryItem> =>
  handleJsonResponse<InventoryItem>(
    fetchWithTokenRefresh(`${API_BASE}/items/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export interface SplitTransferPayload {
  quantity: number;
  location_id?: number;
  branch_id?: number | null;
  room_no?: string;
  received_by_id?: number | null;
  received_by_name?: string;
  received_by_role?: string;
  remarks?: string;
}

export interface BulkAllocateBufferPayload {
  item_name?: string;
  category_id?: number;
  item_ids?: number[];
  quantity: number;
  location_id?: number;
  branch_id: number;
  room_no?: string;
  unit_rooms?: Record<string, string> | string[];
  received_by_name?: string;
  received_by_role?: string;
  remarks?: string;
}

export const bulkAllocateBuffer = (
  data: BulkAllocateBufferPayload
): Promise<{ message: string; allocated_count: number; allocated_codes: string[]; target_department: string }> =>
  handleJsonResponse(
    fetchWithTokenRefresh(`${API_BASE}/items/bulk_allocate_buffer/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const splitTransferInventoryItem = (
  id: number,
  data: SplitTransferPayload
): Promise<{ message: string; mode: string; source_item: InventoryItem; new_item?: InventoryItem }> =>
  handleJsonResponse(
    fetchWithTokenRefresh(`${API_BASE}/items/${id}/split_transfer/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const deleteInventoryItem = (id: number): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/items/${id}/`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  );

export const fetchItemHistory = (itemId: number): Promise<InventoryHistoryLog[]> =>
  handleJsonResponse<InventoryHistoryLog[]>(
    fetchWithTokenRefresh(`${API_BASE}/items/${itemId}/history/`, { headers: authHeaders() }),
    true
  );

export const generateItemQR = (itemId: number): Promise<{ qr_code_url: string; item_code: string }> =>
  handleJsonResponse<{ qr_code_url: string; item_code: string }>(
    fetchWithTokenRefresh(`${API_BASE}/items/${itemId}/generate_qr/`, {
      method: "POST",
      headers: authHeaders(),
    })
  );

export const lookupItemByCode = (code: string): Promise<InventoryItem> =>
  handleJsonResponse<InventoryItem>(
    fetchWithTokenRefresh(`${API_BASE}/items/lookup_by_code/?code=${encodeURIComponent(code)}`, {
      headers: authHeaders(),
    })
  );

// Procurement
export const fetchProcurementRequests = (params: Record<string, any> = {}): Promise<ProcurementRequest[]> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<ProcurementRequest[]>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/?${query.toString()}`, { headers: authHeaders() }),
    true
  );
};

export const fetchProcurementRequestsPaginated = (params: Record<string, any> = {}): Promise<PaginatedInventoryResponse<ProcurementRequest>> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<PaginatedInventoryResponse<ProcurementRequest>>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const createProcurementRequest = (data: any): Promise<ProcurementRequest> =>
  handleJsonResponse<ProcurementRequest>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const endorseProcurementRequest = (id: number, remarks: string = ""): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/${id}/endorse/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ remarks }),
    })
  );

export const sanctionProcurementRequest = (id: number, decision: 'approved' | 'rejected', remarks: string = ""): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/${id}/sanction/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ decision, remarks }),
    })
  );

export interface PersonnelItem {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id?: number;
  branch_name?: string;
}

export interface PersonnelResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: PersonnelItem[];
}

export const fetchInventoryPersonnel = async (
  params: Record<string, any> = {}
): Promise<PersonnelResponse> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  const res = await fetchWithTokenRefresh(`${API_BASE}/procurements/personnel/?${query.toString()}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || "Failed to fetch personnel");
  }
  if (Array.isArray(data)) {
    return {
      count: data.length,
      total_pages: 1,
      current_page: 1,
      page_size: data.length,
      results: data,
    };
  }
  return {
    count: data.count || 0,
    total_pages: data.total_pages || 1,
    current_page: data.current_page || 1,
    page_size: data.page_size || 10,
    results: Array.isArray(data.results) ? data.results : [],
  };
};

export const stockInProcurementRequest = (
  id: number,
  data: {
    location_id: number;
    branch_id?: number | null;
    room_no?: string;
    quantity?: number;
    stock_remaining_as_buffer?: boolean;
    cost_per_unit?: number;
    vendor_name?: string;
    invoice_no?: string;
    received_by_id?: number | null;
    received_by_name?: string;
    received_by_role?: string;
  }
): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/${id}/convert_to_inventory/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const createQuotationFromProcurement = (
  id: number,
  data: {
    mode: 'rfq' | 'manual';
    company_email?: string;
    last_reply_date?: string;
    description?: string;
    vendor_name?: string;
    vendor_email?: string;
    vendor_phone?: string;
    total_amount?: number | string;
    quote_document_url?: string;
    auto_order?: boolean;
  }
): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/${id}/create_quotation/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const markProcurementDelivered = (id: number): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/procurements/${id}/mark_delivered/`, {
      method: "POST",
      headers: authHeaders(),
    })
  );

// Quotations
export const fetchInventoryQuotations = (params: Record<string, any> = {}): Promise<InventoryQuotation[]> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<InventoryQuotation[]>(
    fetchWithTokenRefresh(`${API_BASE}/quotations/?${query.toString()}`, { headers: authHeaders() }),
    true
  );
};

export const fetchInventoryQuotationsPaginated = (
  params: Record<string, any> = {}
): Promise<PaginatedInventoryResponse<InventoryQuotation>> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<PaginatedInventoryResponse<InventoryQuotation>>(
    fetchWithTokenRefresh(`${API_BASE}/quotations/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const createInventoryQuotation = (data: any): Promise<InventoryQuotation> =>
  handleJsonResponse<InventoryQuotation>(
    fetchWithTokenRefresh(`${API_BASE}/quotations/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const acceptQuotationResponse = (quotationId: number, responseId: number): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/quotations/${quotationId}/accept_response/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ response_id: responseId }),
    })
  );

export const addQuotationManualResponse = (
  quotationId: number,
  data: {
    vendor_name: string;
    vendor_email?: string;
    vendor_phone?: string;
    total_amount: number;
    description?: string;
    quote_document_url?: string;
    auto_accept?: boolean;
  }
): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/quotations/${quotationId}/add_response/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

// Public Quotation Portal
export const fetchPublicQuotation = (token: string): Promise<any> =>
  handleJsonResponse<any>(
    fetch(`${API_BASE}/public/quotations/${token}/`)
  );

export const submitPublicQuotation = (token: string, data: any): Promise<any> =>
  handleJsonResponse<any>(
    fetch(`${API_BASE}/public/quotations/${token}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  );

// Tickets
export const fetchInventoryTickets = (params: Record<string, any> = {}): Promise<InventoryTicket[]> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<InventoryTicket[]>(
    fetchWithTokenRefresh(`${API_BASE}/tickets/?${query.toString()}`, { headers: authHeaders() }),
    true
  );
};

export const fetchInventoryTicketsPaginated = (params: Record<string, any> = {}): Promise<PaginatedInventoryResponse<InventoryTicket>> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return handleJsonResponse<PaginatedInventoryResponse<InventoryTicket>>(
    fetchWithTokenRefresh(`${API_BASE}/tickets/?${query.toString()}`, { headers: authHeaders() })
  );
};

export const createInventoryTicket = (data: any): Promise<InventoryTicket> =>
  handleJsonResponse<InventoryTicket>(
    fetchWithTokenRefresh(`${API_BASE}/tickets/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

export const updateInventoryTicket = (id: number, data: { notes: string; status?: string; assigned_to_id?: number; attachment_url?: string }): Promise<any> =>
  handleJsonResponse<any>(
    fetchWithTokenRefresh(`${API_BASE}/tickets/${id}/add_update/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  );

// File Upload
export const uploadInventoryFile = async (file: File, folder: string = "inventory/assets"): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetchWithTokenRefresh(`${API_BASE}/upload-file/`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "File upload failed");
  return data.file_url;
};

