import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Type definitions for COE API responses

export interface DashboardStats {
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  total_students: number;
  upcoming_exams: number;
  recent_activity: Array<{
    description: string;
    timestamp: string;
    type: string;
    status: string;
  }>;
  qp_stats?: {
    total_qps: number;
    pending_coe_qps: number;
    finalized_qps: number;
    recent_qp_activity: Array<{
      description: string;
      timestamp: string;
      type: string;
      status: string;
    }>;
  };

  published_results_summary?: {
    total_published_results: number;
    recent_published_results: Array<{
      student_name: string;
      usn: string;
      upload_batch: string;
      published_at: string;
      withheld: boolean;
      overall_status: string;
    }>;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  message?: string;
  data?: DashboardStats;
}

export interface StudentApplicationStatus {
  student_id: number;
  student_name: string;
  roll_number: string;
  status: 'applied' | 'not_applied';
  applied_subjects: string[];
  applied_count: number;
}

export interface StudentStatusSummary {
  total_students: number;
  applied_students: number;
  not_applied_students: number;
  application_rate: number;
}

export interface StudentApplicationStatusResponse {
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    students: StudentApplicationStatus[];
    summary: StudentStatusSummary;
    filters: {
      batch: string;
      exam_period: string;
      branch: string;
      semester: string;
    };
  };
}

export interface CourseApplicationStats {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  faculty_name: string;
  applied_students: number;
  total_students: number;
  application_rate: number;
}

export interface CourseStatsSummary {
  total_courses: number;
  total_applications: number;
  average_application_rate: number;
}

export interface CourseApplicationStatsResponse {
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    courses: CourseApplicationStats[];
    summary: CourseStatsSummary;
    filters: {
      batch: string;
      exam_period: string;
      branch: string;
      semester: string;
    };
  };
}

export interface Batch {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Semester {
  id: number;
  number: number;
}

export interface FilterOptions {
  batches: Batch[];
  branches: Branch[];
}

export interface FilterOptionsResponse {
  success: boolean;
  message?: string;
  data?: any[];
}

// API Functions

/**
 * Fetch COE dashboard statistics
 */
export const getCOEDashboardStats = async (): Promise<DashboardStatsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/dashboard-stats/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching COE dashboard stats:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Fetch student application status with filters
 */
export const getStudentApplicationStatus = async (filters: {
  batch: string;
  exam_period: string;
  branch: string;
  semester: string;
  page?: string | number;
  page_size?: string | number;
}): Promise<StudentApplicationStatusResponse> => {
  try {
    const params = new URLSearchParams({
      ...filters,
      page: String(filters.page || 1),
      page_size: String(filters.page_size || 10)
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-applications/students/?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Handle standard DRF pagination format
    if (result.results) {
      return {
        success: true,
        count: result.count,
        next: result.next,
        previous: result.previous,
        data: result.results
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching student application status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Fetch course application statistics with filters
 */
export const getCourseApplicationStats = async (filters: {
  batch: string;
  exam_period: string;
  branch: string;
  semester: string;
  page?: string | number;
  page_size?: string | number;
}): Promise<CourseApplicationStatsResponse> => {
  try {
    const params = new URLSearchParams({
      ...filters,
      page: String(filters.page || 1),
      page_size: String(filters.page_size || 10)
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-applications/courses/?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Handle standard DRF pagination format
    if (result.results) {
      return {
        success: true,
        count: result.count,
        next: result.next,
        previous: result.previous,
        data: result.results
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching course application stats:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Fetch filter options (batches, branches)
 */
export const getFilterOptions = async (): Promise<{
  batches: Batch[];
  branches: Branch[];
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/filter-options/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      const data = result.data;
      return {
        batches: Array.isArray(data?.batches) ? data.batches : [],
        branches: Array.isArray(data?.branches) ? data.branches : []
      };
    }

    throw new Error(result.message || 'Failed to fetch filter options');
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return {
      batches: [],
      branches: []
    };
  }
};

/**
 * Fetch semesters for a specific branch
 */
export const getSemesters = async (branchId: number): Promise<Semester[]> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/semesters/?branch_id=${branchId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return Array.isArray(result.data?.semesters) ? result.data.semesters : [];
    } else {
      throw new Error(result.message || 'Failed to fetch semesters');
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return [];
  }
};

/**
 * Fetch paginated exam applications (COE)
 */
export const getExamApplications = async (paramsObj: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ success: boolean; message?: string; data?: { applications: any[]; pagination?: any } }> => {
  try {
    const params = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-applications/?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // Backend uses paginator: {count,next,previous,results: {success, applications...}}
    if ((result as any).results) {
      const pag = result as any;
      const payload = pag.results as any;
      return {
        success: payload.success,
        data: {
          applications: payload.applications,
          pagination: { count: pag.count, next: pag.next, previous: pag.previous }
        }
      };
    }

    // Fallback
    return result;
  } catch (error) {
    console.error('Error fetching exam applications:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Create result upload batch
export const createResultUploadBatch = async (payload: { batch: string; branch: string; semester: string; exam_period: string }) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/result-upload/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating result upload batch:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getStudentsForUpload = async (uploadId: number, page?: number, page_size?: number, request_type?: string) => {
  try {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', String(page));
    if (page_size !== undefined) params.append('page_size', String(page_size));
    if (request_type !== undefined && request_type !== '') params.append('request_type', request_type);

    const url = `${API_ENDPOINT}/coe/result-upload/${uploadId}/students/` + (params.toString() ? `?${params}` : '');
    const response = await fetchWithTokenRefresh(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if ((result as any).results) {
      const pag = result as any;
      const payload = pag.results as any;
      return {
        success: payload.success,
        data: {
          students: payload.students,
          pagination: { count: pag.count, next: pag.next, previous: pag.previous }
        }
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching students for upload:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getStudentsForRevalMakeupUpload = async (uploadId: number, page?: number, page_size?: number, request_type?: string) => {
  try {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', String(page));
    if (page_size !== undefined) params.append('page_size', String(page_size));
    if (request_type !== undefined && request_type !== '') params.append('request_type', request_type);

    const url = `${API_ENDPOINT}/coe/result-upload/${uploadId}/reval-makeup-students/` + (params.toString() ? `?${params}` : '');
    const response = await fetchWithTokenRefresh(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if ((result as any).results) {
      const pag = result as any;
      const payload = pag.results as any;
      return {
        success: payload.success,
        data: {
          students: payload.students,
          pagination: { count: pag.count, next: pag.next, previous: pag.previous }
        }
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching students for reval/makeup upload:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const saveMarksForUpload = async (uploadId: number, marks: any[]) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/result-upload/${uploadId}/marks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving marks for upload:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const publishUploadBatch = async (uploadId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/result-upload/${uploadId}/publish/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('Error publishing upload batch:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const unpublishUploadBatch = async (uploadId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/result-upload/${uploadId}/unpublish/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('Error unpublishing upload batch:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Fetch paginated published results with optional filters
 */
export const getPublishedResults = async (filters: {
  upload_id?: string | number;
  batch_id?: string | number;
  branch_id?: string | number;
  semester_id?: string | number;
  student_usn?: string;
  page?: number;
  page_size?: number;
}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/published-results/?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    if ((result as any).results) {
      const pag = result as any;
      const payload = pag.results as any;
      return {
        success: payload.success,
        data: {
          published_results: payload.published_results,
          pagination: { count: pag.count, next: pag.next, previous: pag.previous }
        }
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching published results:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Public view by token
export const publicViewResultByToken = async (token: string, usn: string) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/results/view/${token}/?usn=${encodeURIComponent(usn)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching public result by token:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Toggle withhold status for a published result
 */
export const toggleWithholdResult = async (resultId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/published-results/${resultId}/toggle-withhold/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('Error toggling withhold status:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Types for exam requests
export interface MakeupRequest {
  id: number;
  student_name: string;
  student_usn: string;
  subject_name: string;
  subject_code: string;
  batch: string;
  branch: string;
  semester: number;
  section: string | null;
  exam_period: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  attachment: string | null;
  requested_at: string;
  processed_by: string | null;
  processed_at: string | null;
  response_note: string | null;
}

export interface RevaluationRequest {
  id: number;
  student_name: string;
  student_usn: string;
  subject_name: string;
  subject_code: string;
  batch: string;
  branch: string;
  semester: number;
  exam_period: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  attachment: string | null;
  previous_cie: number | null;
  previous_see: number | null;
  previous_total: number | null;
  requested_at: string;
  processed_by: string | null;
  processed_at: string | null;
  response_note: string | null;
}

export interface ExamRequestFilters {
  batches: Batch[];
  branches: Branch[];
}

/**
 * Fetch makeup exam requests with filtering
 */
export const getMakeupRequests = async (params: {
  batch_id?: number;
  branch_id?: number;
  semester_id?: number;
  exam_period?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ success: boolean; message?: string; data?: { requests: MakeupRequest[]; pagination?: any } }> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    });

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/makeup-requests/?${queryParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // Handle standard DRF pagination format
    if (result.results) {
      return {
        success: true,
        data: {
          requests: result.results,
          pagination: {
            count: result.count,
            next: result.next,
            previous: result.previous
          }
        }
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching makeup requests:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Fetch revaluation requests with filtering
 */
export const getRevaluationRequests = async (params: {
  batch_id?: number;
  branch_id?: number;
  semester_id?: number;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ success: boolean; message?: string; data?: { requests: RevaluationRequest[]; pagination?: any } }> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    });

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/revaluation-requests/?${queryParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // Handle standard DRF pagination format
    if (result.results) {
      return {
        success: true,
        data: {
          requests: result.results,
          pagination: {
            count: result.count,
            next: result.next,
            previous: result.previous
          }
        }
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching revaluation requests:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Fetch exam request filter options
 */
export const getExamRequestFilters = async (): Promise<{ success: boolean; message?: string; data?: ExamRequestFilters }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-request-filters/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error fetching exam request filters:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Update makeup request status
 */
export const updateMakeupRequestStatus = async (requestId: number, status: 'pending' | 'approved' | 'rejected', responseNote?: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/makeup-requests/${requestId}/status/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, response_note: responseNote })
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating makeup request status:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Update revaluation request status
 */
export const updateRevaluationRequestStatus = async (requestId: number, status: 'pending' | 'approved' | 'rejected', responseNote?: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/revaluation-requests/${requestId}/status/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, response_note: responseNote })
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating revaluation request status:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Fetch exam schedule
 */
export const getExamSchedule = async (paramsObj: { page?: number; page_size?: number } = {}): Promise<{ success: boolean; message?: string; data?: any[]; pagination?: any }> => {
  try {
    const params = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-schedule/?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Schedule a new exam
 */
export const scheduleExam = async (payload: any): Promise<{ success: boolean; message?: string; id?: number }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-schedule/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error('Error scheduling exam:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete a scheduled exam
 */
export const deleteExam = async (examId: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-schedule/`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error('Error deleting exam:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};