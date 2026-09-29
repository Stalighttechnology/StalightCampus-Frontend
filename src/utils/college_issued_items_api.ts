import { API_BASE_URL } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface TargetEntity {
  id: number;
  name?: string;
  code?: string;
  number?: number;
  start_year?: number;
  end_year?: number;
  branch_id?: number;
  semester_id?: number;
}

export interface StudentDistEntry {
  batch_id: number;
  branch_id: number;
  semester_id: number;
}

export interface AcademicHierarchyResponse {
  batches: TargetEntity[];
  branches: TargetEntity[];
  semesters: TargetEntity[];
  sections: TargetEntity[];
  student_distribution: StudentDistEntry[];
  categories: { id: string; label: string }[];
}

export interface FilterOptionsResponse {
  batches: TargetEntity[];
  branches: TargetEntity[];
  semesters?: TargetEntity[];
  sections?: TargetEntity[];
  categories: { id: string; label: string }[];
}

export interface SummaryMetrics {
  total_distributions: number;
  total_eligible: number;
  total_issued: number;
  total_pending_confirmation: number;
  total_confirmed: number;
}

export interface CollegeIssuedItemData {
  id: number;
  title: string;
  description: string;
  category: string;
  category_display: string;
  quantity: number;
  issue_date: string | null;
  academic_year?: string;
  status: string;
  remarks?: string;
  created_by?: { id: number; name: string } | null;
  created_at: string;
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code?: string }[];
  semesters: { id: number; number: number }[];
  sections: { id: number; name: string }[];
  eligible_count: number;
  issued_count: number;
  pending_conf_count: number;
  confirmed_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
  summary_metrics?: SummaryMetrics;
  item_title?: string;
  item_category?: string;
  item_date?: string;
  student?: any;
}

export interface StudentIssuedItemRecord {
  id: number;
  student_id: number;
  student_name: string;
  usn: string;
  email?: string;
  phone?: string;
  profile_picture?: string | null;
  batch_name: string;
  branch_name: string;
  branch_code?: string;
  semester_number?: number;
  section_name: string;
  issue_status: "PENDING" | "ISSUED";
  issued_at?: string | null;
  issued_by_name?: string | null;
  confirmation_status: "PENDING" | "CONFIRMED" | "NOT_RECEIVED";
  confirmed_at?: string | null;
  remarks?: string;
}

export interface StudentHistoryRecord {
  id: number;
  item_id: number;
  item_title: string;
  item_description: string;
  category: string;
  category_display: string;
  quantity: number;
  issue_date: string | null;
  academic_year?: string;
  issue_status: "PENDING" | "ISSUED";
  issued_at?: string | null;
  issued_by_name?: string | null;
  confirmation_status: "PENDING" | "CONFIRMED" | "NOT_RECEIVED";
  confirmed_at?: string | null;
  remarks?: string;
}

export interface TargetGroupPayload {
  id: string; // client-side unique id for row management
  batch_id: number | null;
  branch_id: number | "ALL" | null;
  semester_id: number | "ALL" | null;
  section_ids: number[]; // empty means all sections
}

export interface CreateIssuePayload {
  title: string;
  description?: string;
  category?: string;
  quantity?: number;
  issue_date?: string;
  academic_year?: string;
  remarks?: string;
  target_groups?: {
    batch_id: number;
    branch_id?: number | "ALL" | null;
    semester_id?: number | "ALL" | null;
    section_ids?: number[];
  }[];
  batch_ids?: number[];
  branch_ids?: number[];
  semester_ids?: number[];
  section_ids?: number[];
}

export const fetchAcademicHierarchy = async (): Promise<AcademicHierarchyResponse> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/academic-hierarchy/`);
  if (!res.ok) throw new Error("Failed to fetch academic hierarchy");
  return res.json();
};

export const previewEligibleCount = async (
  target_groups: {
    batch_id: number;
    branch_id?: number | "ALL" | null;
    semester_id?: number | "ALL" | null;
    section_ids?: number[];
  }[]
): Promise<number> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/preview-count/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_groups }),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.eligible_count || 0;
};

export const fetchFilterOptions = async (): Promise<FilterOptionsResponse> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/filter-options/`);
  if (!res.ok) throw new Error("Failed to fetch filter options");
  return res.json();
};

export const fetchIssuedItemsList = async (params: {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  batch_id?: string | number;
  branch_id?: string | number;
}): Promise<PaginatedResponse<CollegeIssuedItemData>> => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page.toString());
  if (params.page_size) query.append("page_size", params.page_size.toString());
  if (params.search) query.append("search", params.search);
  if (params.category) query.append("category", params.category);
  if (params.status) query.append("status", params.status);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.batch_id) query.append("batch_id", params.batch_id.toString());
  if (params.branch_id) query.append("branch_id", params.branch_id.toString());

  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch issued items list");
  return res.json();
};

export const createIssuedItem = async (payload: CreateIssuePayload): Promise<any> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create issued item");
  return data;
};

export const updateIssuedItem = async (id: number, payload: Partial<CreateIssuePayload> & { status?: string }): Promise<any> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update issued item");
  return data;
};

export const deleteIssuedItem = async (id: number): Promise<any> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/${id}/`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete issued item");
  return data;
};

export const fetchIssuedStudents = async (
  itemId: number,
  params: {
    page?: number;
    page_size?: number;
    search?: string;
    issue_status?: string;
    confirmation_status?: string;
    batch_id?: string | number;
    branch_id?: string | number;
  }
): Promise<PaginatedResponse<StudentIssuedItemRecord>> => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page.toString());
  if (params.page_size) query.append("page_size", params.page_size.toString());
  if (params.search) query.append("search", params.search);
  if (params.issue_status) query.append("issue_status", params.issue_status);
  if (params.confirmation_status) query.append("confirmation_status", params.confirmation_status);
  if (params.batch_id) query.append("batch_id", params.batch_id.toString());
  if (params.branch_id) query.append("branch_id", params.branch_id.toString());

  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/${itemId}/students/?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch issued students");
  return res.json();
};

export const markStudentsIssued = async (
  itemId: number,
  payload: { student_issued_ids?: number[]; all_pending?: boolean; remarks?: string }
): Promise<any> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/${itemId}/mark-issued/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark as issued");
  return data;
};

export const fetchStudentIssueHistory = async (
  studentId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<StudentHistoryRecord>> => {
  const res = await fetchWithTokenRefresh(
    `${API_BASE_URL}/api/college-issued-items/student-history/${studentId}/?page=${page}&page_size=${pageSize}`
  );
  if (!res.ok) throw new Error("Failed to fetch student issue history");
  return res.json();
};

export const fetchMyIssuedItems = async (
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<StudentHistoryRecord>> => {
  const res = await fetchWithTokenRefresh(
    `${API_BASE_URL}/api/college-issued-items/my-items/?page=${page}&page_size=${pageSize}`
  );
  if (!res.ok) throw new Error("Failed to fetch your issued items");
  return res.json();
};

export const confirmStudentItemReceipt = async (
  recordId: number,
  status: "CONFIRMED" | "NOT_RECEIVED" = "CONFIRMED"
): Promise<any> => {
  const res = await fetchWithTokenRefresh(`${API_BASE_URL}/api/college-issued-items/${recordId}/confirm-receipt/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update receipt status");
  return data;
};

export const updateStudentIssuedRecordStatus = async (
  recordId: number,
  payload: {
    confirmation_status?: "CONFIRMED" | "NOT_RECEIVED" | "PENDING";
    issue_status?: "ISSUED" | "PENDING";
    remarks?: string;
  }
): Promise<{ success: boolean; message: string; record: any }> => {
  const res = await fetchWithTokenRefresh(
    `${API_BASE_URL}/api/college-issued-items/student-record/${recordId}/update-status/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update record status");
  return data;
};
