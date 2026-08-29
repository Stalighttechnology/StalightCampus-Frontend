import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface AssignedSubject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  sections: Array<{section: string;section_id: string;semester: number;semester_id: string;branch: string;branch_id: string;}>;
}

export const getAssignedSubjectsGrouped = async (): Promise<{success: boolean;data?: any;grouped?: AssignedSubject[];message?: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assigned-subjects/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export interface UploadStudyMaterialRequest {
  title: string;
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  semester_id: string;
  branch_id: string;
  section_id?: string;
  file_url: string;
}

export interface GetR2PresignedUrlResponse {
  success: boolean;
  message?: string;
  data?: {
    url: string;
    file_url: string;
  };
}

export const getR2PresignedUrl = async (file_name: string, file_type: string, folder: string = 'study_materials'): Promise<GetR2PresignedUrlResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/common/generate-r2-presigned-url/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name, file_type, folder })
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const uploadStudyMaterial = async (data: UploadStudyMaterialRequest) => {
  try {
    if (!data.branch_id || !data.semester_id || !data.title || !data.file_url) {
      throw new Error("Branch ID, Semester ID, Title, and File URL are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/study-materials/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const deleteStudyMaterial = async (material_id: string): Promise<any> => {
  try {
    if (!material_id) throw new Error("Material ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/study-materials/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id })
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getStudyMaterials = async (branch_id?: string, semester_id?: string, section_id?: string, search?: string, page: number = 1, page_size: number = 20) => {
  try {
    const params = new URLSearchParams();
    if (branch_id) params.append('branch_id', branch_id);
    if (semester_id) params.append('semester_id', semester_id);
    if (section_id) params.append('section_id', section_id);
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('page_size', String(page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/study-materials/${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getBranches = async (): Promise<{success: boolean;data?: {id: string;name: string;}[];message?: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/branches/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getBatches = async (): Promise<{success: boolean;data?: {id: string;name: string;}[];message?: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/batches/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getSemesters = async (branch_id: string): Promise<{success: boolean;data?: {id: string;number: number;}[];message?: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/semesters/?branch_id=${branch_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getSections = async (branch_id: string, semester_id: string): Promise<{success: boolean;data?: {id: string;name: string;}[];message?: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/sections/?branch_id=${branch_id}&semester_id=${semester_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

// In-flight request deduplication map to avoid duplicate network calls (useful in React StrictMode)
const inflightRequests: Map<string, Promise<any>> = new Map();

// Type definitions for request and response data
interface DashboardOverviewResponse {
  success: boolean;
  message?: string;
  data?: {
    today_classes: Array<{
      subject: string;
      section: string;
      start_time: string;
      end_time: string;
      room: string;
    }>;
    attendance_snapshot: number;
    unread_announcement_count?: number;
    quick_actions: string[];
  };
}

export interface TakeAttendanceRequest {
  branch_id: string;
  subject_id: string;
  section_id: string;
  semester_id: string;
  lab_batch_id?: string | number;
  method: "manual" | "ai";
  date?: string; // YYYY-MM-DD
  class_images?: File[];
  attendance?: Array<{student_id: string;status: boolean;}>;
}

interface TakeAttendanceResponse {
  success: boolean;
  message?: string;
}

export interface UploadMarksRequest {
  branch_id: string;
  semester_id: string;
  section_id: string;
  subject_id: string;
  test_number: number;
  marks?: Array<{student_id: string;mark: number;}>;
  file?: File;
}

interface UploadMarksResponse {
  success: boolean;
  message?: string;
}

export interface ApplyLeaveRequest {
  title: string;
  branch_ids: number[];
  start_date: string;
  end_date: string;
  reason: string;
  leave_type?: string;
  start_time?: string;
  end_time?: string;
  is_half_day?: boolean;
  half_day_session?: 'forenoon' | 'afternoon';
  alternate_faculty_id?: number | string | null;
  od_purpose_category?: string;
  document?: File;
  initial_document_url?: string;
}

interface ApplyLeaveResponse {
  success: boolean;
  message?: string;
  data?: any;
}

interface ViewAttendanceRecordsResponse {
  success: boolean;
  message?: string;
  data?: Array<{
    student: string;
    usn: string;
    total_sessions: number;
    present: number;
    percentage: number;
  }>;
}

export interface CreateAnnouncementRequest {
  branch_id: string;
  semester_id: string;
  section_id: string;
  title: string;
  content: string;
  target?: "student" | "faculty" | "both";
  student_usns?: string[];
}

interface CreateAnnouncementResponse {
  success: boolean;
  message?: string;
}

// Update the ProctorStudent interface to match the new backend response
export interface ProctorStudent {
  id: number;
  name: string;
  usn: string;
  status?: string;
  branch: string | null;
  branch_id: number | null;
  semester: number | null;
  semester_id: number | null;
  batch: string | null;
  batch_id: number | null;
  section: string | null;
  section_id: number | null;
  attendance: number | string;
  marks: Array<{
    subject: string;
    subject_code: string | null;
    test_number: number;
    mark: number;
    max_mark: number;
  }>;
  ia_marks: Array<{
    subject: string;
    subject_code: string | null;
    total_obtained: number;
    max_marks: number;
  }>;
  parent_phone: string | null;
  student_contact: string | null;
  email: string | null;
  attendance_history: Array<{
    date: string;
    status: string;
    subject: string;
  }>;
  certificates: Array<{
    title: string;
    file: string | null;
    uploaded_at: string;
  }>;
  latest_leave_request: {
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
  } | null;
  user_info: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    mobile_number: string | null;
    address: string | null;
    bio: string | null;
  } | null;
  face_encodings: unknown;
  proctor: {
    id: number | null;
    name: string | null;
    email: string | null;
  } | null;
  leave_requests?: LeaveRow[];
}

export interface GetProctorStudentsResponse {
  success: boolean;
  message?: string;
  data?: ProctorStudent[];
  pagination?: {
    page: number;
    page_size: number;
    total_students: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface TimetableEntry {
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  section: string;
  semester: number;
  branch: string;
  faculty_name: string;
  room: string;
}

export interface FacultyAssignment {
  subject_name: string;
  subject_code: string;
  subject_id: number;
  subject_type?: string;
  section: string;
  section_id: number;
  semester: number;
  semester_id: number;
  branch: string;
  branch_id: number;
  has_timetable: boolean;
  lab_batches?: Array<{ id: number | string; name: string }>;
}

export interface FacultyLeaveRequest {
  id: string | number;
  title?: string;
  branch?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  current_stage?: string;
  configured_stages?: string[];
  od_purpose_category?: string;
  initial_document_url?: string | null;
  completion_document_url?: string | null;
  od_completion_verified?: boolean;
  od_completion_verified_by?: string | null;
  od_completion_verified_at?: string | null;
  od_completion_remarks?: string;
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  alternate_duty_remarks?: string;
  alternate_duty_acted_at?: string | null;
  hod_approval_status?: string;
  hod_remarks?: string;
  hod_reviewed_by?: string | null;
  hod_reviewed_at?: string | null;
  intermediate_approval_status?: string;
  intermediate_remarks?: string;
  intermediate_reviewed_by?: string | null;
  intermediate_reviewed_at?: string | null;
  principal_approval_status?: string;
  principal_remarks?: string;
  principal_reviewed_by?: string | null;
  principal_reviewed_at?: string | null;
  applied_on?: string;
}

export interface LeaveQuota {
  // Backward compatible fields
  total_standard_leaves: number;
  used_standard_leaves: number;
  remaining_standard_leaves: number;
  monthly_short_permission_limit: number;
  used_short_permissions_this_month: number;
  remaining_short_permissions_this_month: number;
  short_permission_max_hours: number;
  approver_role?: string;
  approver_label?: string;
  workflow_pipeline?: string[];

  // 9.8 Rule Specific Quotas
  cl_total?: number;
  cl_annual_limit?: number;
  cl_used?: number;
  cl_remaining?: number;
  cl_max_stretch?: number;

  el_total_annual?: number;
  el_annual_limit?: number;
  el_accrued_to_date?: number;
  el_credited_so_far?: number;
  el_used?: number;
  el_remaining?: number;
  el_min_stretch?: number;
  el_max_stretch?: number;
  el_jan_credit?: number;
  el_jul_credit?: number;
  el_half_year_period?: string;
  is_el_eligible?: boolean;

  rh_total?: number;
  rh_annual_limit?: number;
  rh_used?: number;
  rh_remaining?: number;
  rh_used_this_month?: number;
  rh_monthly_limit?: number;
  rh_remaining_this_month?: number;

  sp_monthly_limit?: number;
  short_permission_limit_monthly?: number;
  sp_used_this_month?: number;
  short_permission_used_this_month?: number;
  sp_remaining_this_month?: number;
  short_permission_remaining_this_month?: number;
  sp_max_hours?: number;
  short_permission_max_hours?: number;

  vacation_total?: number;
  vacation_annual_limit?: number;
  vacation_used?: number;
  vacation_remaining?: number;
  is_vacation_eligible?: boolean;
  is_probationary?: boolean;

  maternity_total?: number;
  maternity_annual_limit?: number;
  maternity_used?: number;
  maternity_remaining?: number;
  is_maternity_eligible?: boolean;

  od_total_approved_days?: number;
  od_pending_certificates_count?: number;
  od_require_initial_proof?: boolean;
  od_require_attendance_certificate?: boolean;
  is_od_eligible?: boolean;

  policy_rules?: any;
  num_stages?: number;
  workflow_stages?: string[];
  require_alternate_duty?: boolean;
}

interface GetFacultyAssignmentsResponse {
  success: boolean;
  message?: string;
  data?: FacultyAssignment[];
}

interface GetFacultyDashboardBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    proctor_students_count?: number;
    performance_trends?: {
      avg_attendance_percent_30d?: number;
      avg_ia_mark?: number;
    };
    subject_performance_trends?: Array<{
      subject_id: number;
      subject_name: string;
      subject_code: string;
      avg_attendance_percent_30d: number;
      avg_ia_mark: number;
    }>;
    // Added: today's classes and quick actions bundled in bootstrap
    today_classes?: Array<{
      subject: string;
      section: string;
      semester?: number | null;
      branch?: string | null;
      start_time: string;
      end_time: string;
      room: string;
    }>;
    attendance_snapshot?: number;
    unread_announcement_count?: number;
    quick_actions?: string[];
  };
}

interface AttendanceRecordSummary {
  id: number;
  date: string;
  subject: string | null;
  section: string | null;
  semester: number | null;
  branch: string | null;
  file_path: string | null;
  status: string;
  branch_id: number | null;
  section_id: number | null;
  subject_id: number | null;
  semester_id: number | null;
  summary: {
    present_count: number;
    absent_count: number;
    total_count: number;
    present_percentage: number;
  };
}

interface GetAttendanceRecordsWithSummaryResponse {
  success: boolean;
  message?: string;
  data?: AttendanceRecordSummary[];
  pagination?: {
    page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface LeaveQuota {
  // Academic Year Cycle
  academic_year_label?: string;
  academic_year_start_date?: string;
  academic_year_end_date?: string;
  academic_year_start_month?: number;

  // Backward compatible fields
  total_standard_leaves: number;
  used_standard_leaves: number;
  remaining_standard_leaves: number;
  monthly_short_permission_limit: number;
  used_short_permissions_this_month: number;
  remaining_short_permissions_this_month: number;
  short_permission_max_hours: number;
  approver_role: string;
  approver_label: string;
  workflow_pipeline?: string[];

  // 9.8 Rule Specific Quotas
  cl_is_enabled?: boolean;
  cl_annual_limit?: number;
  cl_used?: number;
  cl_remaining?: number;
  cl_max_stretch?: number;
  el_is_enabled?: boolean;
  el_annual_limit?: number;
  el_credited_so_far?: number;
  el_used?: number;
  el_remaining?: number;
  el_min_stretch?: number;
  el_max_stretch?: number;
  el_jan_credit?: number;
  el_jul_credit?: number;
  el_half_year_period?: string;
  is_el_eligible?: boolean;
  od_is_enabled?: boolean;
  od_total_approved_days?: number;
  od_pending_certificates_count?: number;
  is_od_eligible?: boolean;
  vacation_is_enabled?: boolean;
  vacation_annual_limit?: number;
  vacation_used?: number;
  vacation_remaining?: number;
  is_vacation_eligible?: boolean;
  maternity_is_enabled?: boolean;
  maternity_annual_limit?: number;
  maternity_used?: number;
  maternity_remaining?: number;
  is_maternity_eligible?: boolean;
  rh_is_enabled?: boolean;
  rh_annual_limit?: number;
  rh_used?: number;
  rh_remaining?: number;
  rh_used_this_month?: number;
  rh_remaining_this_month?: number;
  sp_is_enabled?: boolean;
  short_permission_limit_monthly?: number;
  short_permission_used_this_month?: number;
  short_permission_remaining_this_month?: number;
  policy_rules?: any;
}

export interface ColleagueOption {
  id: number;
  name: string;
  role: string;
  username: string;
  branch_id?: number | null;
  branch_name?: string | null;
}

export interface GetApplyLeaveBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    assignments: FacultyAssignment[];
    leave_requests: FacultyLeaveRequest[];
    branches: { id: number; name: string; branch_code?: string; }[];
    faculty_branch?: { id: number; name: string; branch_code?: string; } | null;
    leave_quota?: LeaveQuota;
    available_colleagues?: ColleagueOption[];
  };
}

interface GetTimetableResponse {
  success: boolean;
  message?: string;
  data?: TimetableEntry[];
}

interface ChatChannel {
  id: string;
  type: string;
  subject: string | null;
  section: string | null;
  participants: string[];
}

interface ManageChatResponse {
  success: boolean;
  message?: string;
  data?: ChatChannel[];
}

interface SendChatMessageRequest {
  channel_id?: string;
  message: string;
  type?: "subject" | "proctor" | "faculty";
  branch_id?: string;
  semester_id?: string;
  subject_id?: string;
  section_id?: string;
}

export interface ManageProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  address?: string;
  bio?: string;
  profile_picture?: File;
  // Faculty-specific fields
  date_of_birth?: string; // YYYY-MM-DD
  gender?: string;
  department?: string;
  designation?: string;
  qualification?: string;
  branch?: string | number;
  branch_id?: number;
  experience_years?: string | number;
  office_location?: string;
  office_hours?: string;
  library_id?: string;
  vtu_staff_id?: string;
  aicte_id?: string;
}

interface ManageProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    mobile: string;
    address: string;
    bio: string;
    profile_picture: string | null;
  };
}

export interface ScheduleMentoringRequest {
  student_id: string;
  date: string;
  purpose: string;
}

interface ScheduleMentoringResponse {
  success: boolean;
  message?: string;
}

interface GenerateStatisticsResponse {
  success: boolean;
  message?: string;
  data?: {
    pdf_url: string;
    stats: Array<{student__name: string;percentage: number;}>;
  };
}

interface DownloadPDFResponse {
  success: boolean;
  message?: string;
  file_url?: string;
}

export interface ClassStudent {
  id: number;
  name: string;
  usn: string;
}

export interface InternalMarkStudent {
  id: number;
  name: string;
  usn: string;
  mark: number | '';
  max_mark: number;
}

export interface FacultyLeaveRequest {
  id: string;
  title: string;
  branch: string;
  start_date: string;
  end_date: string;
  leave_type?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  reason: string;
  status: string;
  current_stage?: string;
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  alternate_duty_remarks?: string;
  hod_approval_status?: string;
  principal_approval_status?: string;
  applied_on: string;
  reviewed_by?: string | null;
}

export interface AlternateDutyRequestItem {
  id: number;
  applicant_name: string;
  applicant_role: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  title?: string;
  alternate_duty_status: string;
  alternate_duty_remarks?: string;
  applied_on: string;
}

export interface GetAlternateDutyRequestsResponse {
  success: boolean;
  message?: string;
  count?: number;
  total_pages?: number;
  current_page?: number;
  next?: string | null;
  previous?: string | null;
  data?: AlternateDutyRequestItem[] | {
    requests?: AlternateDutyRequestItem[];
    pending_count?: number;
  };
  pending_count?: number;
}



// Faculty-specific API functions
export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/dashboard/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const takeAttendance = async (
data: TakeAttendanceRequest)
: Promise<TakeAttendanceResponse> => {
  try {
    const formData = new FormData();
    formData.append("branch_id", data.branch_id);
    formData.append("subject_id", data.subject_id);
    formData.append("section_id", data.section_id);
    formData.append("semester_id", data.semester_id);
    formData.append("method", data.method);
    if (data.date) formData.append("date", data.date);
    if (data.method === "ai" && data.class_images) {
      data.class_images.forEach((file, index) => {
        formData.append(`class_images[${index}]`, file);
      });
    }
    if (data.method === "manual" && data.attendance) {
      formData.append("attendance", JSON.stringify(data.attendance));
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/take-attendance/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export interface AIAttendanceRequest {
  branch_id: string;
  subject_id: string;
  section_id: string;
  semester_id: string;
  photo: File;
  date?: string; // YYYY-MM-DD
}

interface AIAttendanceResponse {
  success: boolean;
  message?: string;
  data?: {
    total_students: number;
    present_students: Array<{
      id: number;
      name: string;
      usn: string;
      confidence: number;
    }>;
    review_students: Array<{
      id: number;
      name: string;
      usn: string;
      confidence: number;
    }>;
    absent_students: Array<{
      id: number;
      name: string;
      usn: string;
    }>;
  };
}

export const aiAttendance = async (
data: AIAttendanceRequest)
: Promise<AIAttendanceResponse> => {
  try {
    const formData = new FormData();
    formData.append("branch_id", data.branch_id);
    formData.append("subject_id", data.subject_id);
    formData.append("section_id", data.section_id);
    formData.append("semester_id", data.semester_id);
    formData.append("photo", data.photo);
    if (data.date) formData.append("date", data.date);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/ai-attendance/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const uploadInternalMarks = async (
data: UploadMarksRequest)
: Promise<UploadMarksResponse> => {
  try {
    const formData = new FormData();
    if (data.branch_id) formData.append("branch_id", String(data.branch_id));
    if (data.semester_id) formData.append("semester_id", String(data.semester_id));
    if (data.section_id) formData.append("section_id", String(data.section_id));
    if (data.subject_id) formData.append("subject_id", String(data.subject_id));
    formData.append("test_number", data.test_number.toString());
    if (data.marks) {
      formData.append("marks", JSON.stringify(data.marks));
    }
    if (data.file) {
      formData.append("file", data.file);
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/upload-marks/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const applyLeave = async (
  data: ApplyLeaveRequest | FormData
): Promise<ApplyLeaveResponse> => {
  try {
    let body: any;
    let headers: Record<string, string> = {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
    };

    if (data instanceof FormData) {
      body = data;
    } else if (data.document) {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) {
            v.forEach((item) => formData.append(k, String(item)));
          } else {
            formData.append(k, v as any);
          }
        }
      });
      body = formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/apply-leave/`, {
      method: "POST",
      headers,
      body
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error submitting leave application" };
  }
};

export const uploadOdCompletionCertificate = async (data: {
  leave_id: string | number;
  file?: File;
  completion_document_url?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const formData = new FormData();
    formData.append("leave_id", String(data.leave_id));
    if (data.file) formData.append("completion_document", data.file);
    if (data.completion_document_url) formData.append("completion_document_url", data.completion_document_url);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/leaves/od-completion-certificate/upload/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error uploading OD completion certificate" };
  }
};

export const getAlternateDutyRequests = async (params?: {
  page?: number;
  page_size?: number;
  status?: string;
  count_only?: boolean;
}): Promise<GetAlternateDutyRequestsResponse> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.count_only) queryParams.append('count_only', 'true');
    if (params?.status && params.status !== 'All' && params.status !== 'ALL') {
      queryParams.append('status', params.status);
    }
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/alternate-duty-requests/${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const getAvailableColleagues = async (params: {
  role?: string;
  branch_id?: number | string;
}): Promise<{ success: boolean; data?: ColleagueOption[]; message?: string }> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const queryParams = new URLSearchParams();
    if (params.role) queryParams.append('role', params.role);
    if (params.branch_id) queryParams.append('branch_id', params.branch_id.toString());
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/available-colleagues/${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error fetching colleagues" };
  }
};

export const alternateDutyAction = async (data: {
  leave_id: number | string;
  action: 'ACCEPT' | 'DECLINE';
  remarks?: string;
}): Promise<{ success: boolean; message?: string; alternate_duty_status?: string }> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/alternate-duty-requests/action/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const renominateAlternateFaculty = async (data: {
  leave_id: number | string;
  alternate_faculty_id: number | string;
}): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/leaves/renominate-alternate/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const viewAttendanceRecords = async (
params: {branch_id: string;semester_id: string;section_id: string;subject_id: string;})
: Promise<ViewAttendanceRecordsResponse> => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const createAnnouncement = async (
data: CreateAnnouncementRequest)
: Promise<CreateAnnouncementResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/announcements/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getProctorStudents = async (params?: {
  page?: number;
  page_size?: number;
  include?: string | string[]; // e.g. 'students' or ['students']
  exam_period?: string;
  only_with_leaves?: boolean;
  search?: string;
}): Promise<GetProctorStudentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.include) {
      const includes = Array.isArray(params.include) ? params.include : params.include.split(',');
      const normalizedIncludes = includes.map((s) => s.trim()).filter(Boolean);

      // Special-case 'minimal' keyword: backend expects 'minimal=true' flag
      if (normalizedIncludes.includes('minimal')) {
        queryParams.append('minimal', 'true');
      }

      const nonMinimal = normalizedIncludes.filter((s) => s !== 'minimal');
      if (nonMinimal.length > 0) {
        queryParams.append('include', nonMinimal.join(','));
      }
    }

    if (params?.exam_period) {
      queryParams.append('exam_period', params.exam_period);
    }
    if (params?.only_with_leaves) {
      queryParams.append('only_with_leaves', 'true');
    }

    const basePath = params && params.exam_period ?
    `${API_ENDPOINT}/faculty/proctor-students/with-exam-status/` :
    `${API_ENDPOINT}/faculty/proctor-students/`;

    const url = queryParams.toString() ?
    `${basePath}?${queryParams.toString()}` :
    basePath;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Lightweight proctor students fetch for statistics page - requests minimal fields from backend
export const getProctorStudentsForStats = async (params?: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<GetProctorStudentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    // Ask backend to return a minimal payload optimized for statistics
    queryParams.append('minimal', 'true');

    const url = `${API_ENDPOINT}/faculty/proctor-students/?${queryParams.toString()}`;

    // Deduplicate identical simultaneous requests
    if (inflightRequests.has(url)) {
      return inflightRequests.get(url) as Promise<GetProctorStudentsResponse>;
    }

    const promise = (async () => {
      try {
        const response = await fetchWithTokenRefresh(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            "Content-Type": "application/json"
          }
        });
        const json = await response.json();
        return json;
      } finally {
        // remove the in-flight marker after completion
        inflightRequests.delete(url);
      }
    })();

    inflightRequests.set(url, promise);
    return promise;
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  subject_id: string;
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  due_date: string;
  max_marks: string;
  weightage: string;
  file?: File;
}

export const manageAssignments = async (
data?: CreateAssignmentRequest | FormData | null,
method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
assignmentId?: number | string,
params?: {search?: string;page?: number;page_size?: number;}) =>
{
  try {
    let url = `${API_ENDPOINT}/faculty/assignments/manage/`;
    if ((method === "PUT" || method === "DELETE") && assignmentId) {
      url = `${API_ENDPOINT}/faculty/assignments/${assignmentId}/`;
    } else if (method === "GET" && params) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.page_size) query.append('page_size', params.page_size.toString());
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }

    let config: any = {
      method,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    };

    if ((method === "POST" || method === "PUT") && data) {
      if (data instanceof FormData) {
        config.body = data;
      } else {
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("subject_id", data.subject_id);
        if (data.branch_id) formData.append("branch_id", data.branch_id);
        if (data.semester_id) formData.append("semester_id", data.semester_id);
        if (data.section_id) formData.append("section_id", data.section_id);
        formData.append("due_date", data.due_date);
        formData.append("max_marks", data.max_marks);
        formData.append("weightage", data.weightage);
        if (data.file) formData.append("file", data.file);
        config.body = formData;
      }
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    const response = await fetchWithTokenRefresh(url, config);
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getAssignmentDetail = async (assignmentId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assignments/${assignmentId}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getAssignmentSubmissions = async (assignmentId: number) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assignments/${assignmentId}/submissions/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const gradeSubmission = async (submissionId: number, data: {marks_obtained: string;feedback: string;}) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assignments/submissions/${submissionId}/grade/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFacultyAssignments = async (): Promise<GetFacultyAssignmentsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assignments/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

let facultyDashboardPromise: Promise<GetFacultyDashboardBootstrapResponse> | null = null;
let facultyDashboardTimestamp = 0;

export const getFacultyDashboardBootstrap = async (): Promise<GetFacultyDashboardBootstrapResponse> => {
  const now = Date.now();
  if (facultyDashboardPromise && now - facultyDashboardTimestamp < 5000) {
    return facultyDashboardPromise;
  }

  facultyDashboardPromise = (async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/dashboard/bootstrap/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        }
      });
      return await response.json();
    } catch (error) {

      return { success: false, message: "Network error" };
    }
  })();

  facultyDashboardTimestamp = now;
  return facultyDashboardPromise;
};

export const getAttendanceRecordsWithSummary = async (params?: {
  page?: number;
  page_size?: number;
  subject_id?: string;
  lab_batch_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<GetAttendanceRecordsWithSummaryResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    // Clamp page_size to backend max to avoid accidental huge requests
    const MAX_PAGE_SIZE = 500;
    if (params?.page_size) {
      const ps = Math.min(params.page_size, MAX_PAGE_SIZE);
      queryParams.append('page_size', ps.toString());
    }
    if (params?.subject_id) queryParams.append('subject_id', params.subject_id);
    if (params?.lab_batch_id) queryParams.append('lab_batch_id', params.lab_batch_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const url = queryParams.toString() ?
    `${API_ENDPOINT}/faculty/attendance-records/summary/?${queryParams.toString()}` :
    `${API_ENDPOINT}/faculty/attendance-records/summary/`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getApplyLeaveBootstrap = async (params?: {page?: number;page_size?: number;}): Promise<GetApplyLeaveBootstrapResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/apply-leave/bootstrap/${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getTimetable = async (): Promise<GetTimetableResponse> => {
  try {
    const url = `${API_ENDPOINT}/faculty/timetable/`;

    // Deduplicate identical simultaneous requests
    if (inflightRequests.has(url)) {
      return inflightRequests.get(url) as Promise<GetTimetableResponse>;
    }

    const promise = (async () => {
      try {
        const response = await fetchWithTokenRefresh(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
          }
        });
        return await response.json();
      } finally {
        inflightRequests.delete(url);
      }
    })();

    inflightRequests.set(url, promise);
    return promise;
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const manageChat = async (
data: SendChatMessageRequest,
method: "GET" | "POST" = "GET")
: Promise<ManageChatResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/chat/`, {
      method,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: method === "POST" ? JSON.stringify(data) : undefined
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const manageProfile = async (
data: ManageProfileRequest)
: Promise<ManageProfileResponse> => {
  try {
    const formData = new FormData();
    if (data.first_name) formData.append("first_name", data.first_name);
    if (data.last_name) formData.append("last_name", data.last_name);
    if (data.email) formData.append("email", data.email);
    if (data.mobile) formData.append("mobile", data.mobile);
    if (data.address) formData.append("address", data.address);
    if (data.bio) formData.append("bio", data.bio);
    if (data.profile_picture) formData.append("profile_picture", data.profile_picture);
    if (data.profile_picture_url) formData.append("profile_picture_url", data.profile_picture_url);
    // Faculty-specific fields
    if (data.date_of_birth) formData.append("date_of_birth", data.date_of_birth);
    if (data.gender) formData.append("gender", data.gender);
    if (data.department) formData.append("department", data.department);
    if (data.designation) formData.append("designation", data.designation);
    if (data.qualification) formData.append("qualification", data.qualification);
    // prefer explicit branch_id when available
    if (typeof data.branch_id !== 'undefined' && data.branch_id !== null) formData.append("branch_id", String(data.branch_id));else
    if (typeof data.branch !== 'undefined' && data.branch !== null) formData.append("branch", String(data.branch));
    if (typeof data.experience_years !== 'undefined' && data.experience_years !== null) formData.append("experience_years", String(data.experience_years));
    if (data.office_location) formData.append("office_location", data.office_location);
    if (data.office_hours) formData.append("office_hours", data.office_hours);
    if (data.library_id) formData.append("library_id", data.library_id);
    if (data.vtu_staff_id) formData.append("vtu_staff_id", data.vtu_staff_id);
    if (data.aicte_id) formData.append("aicte_id", data.aicte_id);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/profile/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const scheduleMentoring = async (
data: ScheduleMentoringRequest)
: Promise<ScheduleMentoringResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/schedule-mentoring/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const generateStatistics = async (
params: {file_id: string;})
: Promise<GenerateStatisticsResponse> => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/generate-statistics/?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const downloadPDF = async (
filename: string)
: Promise<DownloadPDFResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/download-pdf/${filename}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      return { success: true, file_url: url };
    }
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export async function getStudentsForClass(
branch_id: number,
semester_id: number,
section_id: number,
subject_id: number)
: Promise<ClassStudent[]> {
  const params = new URLSearchParams({
    branch_id: branch_id.toString(),
    semester_id: semester_id.toString(),
    section_id: section_id.toString(),
    subject_id: subject_id.toString()
  });
  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    },
    credentials: 'include'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch students');
  return data.data;
}

export const getInternalMarksForClass = async (
branch_id: number,
semester_id: number,
section_id: number,
subject_id: number,
test_number: number)
: Promise<InternalMarkStudent[]> => {
  const params = new URLSearchParams({
    branch_id: branch_id.toString(),
    semester_id: semester_id.toString(),
    section_id: section_id.toString(),
    subject_id: subject_id.toString(),
    test_number: test_number.toString()
  });
  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/internal-marks/?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    },
    credentials: 'include'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch internal marks');
  return data.data;
};

export const getFacultyLeaveRequests = async (params?: { page?: number; page_size?: number }): Promise<any> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/leave-requests/${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      credentials: 'include'
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const getFacultyLeaveDetails = async (leaveId: string | number): Promise<any> => {
  try {
    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/leaves/${leaveId}/details/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      credentials: 'include'
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const getFacultyProfile = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export async function getFacultyNotifications() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/notifications/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

export async function getFacultySentNotifications() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/notifications/sent/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}



export async function getAttendanceRecordsList() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/list/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

export async function getAttendanceRecordDetails(recordId: number) {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/${recordId}/details/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

export interface LeaveRow {
  id: string;
  student_name: string;
  usn: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

// Bootstrap endpoints for optimized data fetching
export interface GetTakeAttendanceBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    students: Array<{
      id: number;
      name: string;
      usn: string;
      user_id: number | null;
    }>;
    recent_records: Array<{
      id: number;
      date: string;
      present_count: number;
      total_count: number;
      percentage: number;
    }>;
    pagination?: {
      page: number;
      page_size: number;
      total_students: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export interface GetUploadMarksBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    students: Array<{
      id: number;
      name: string;
      usn: string;
      user_id: number | null;
      existing_mark: {
        id: number;
        mark: number;
        max_mark: number;
        uploaded_at: string;
      } | null;
    }>;
    subject_info: {
      name: string;
      code: string;
      test_number: number;
    };
    pagination?: {
      page: number;
      page_size: number;
      total_students: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export const getTakeAttendanceBootstrap = async (params: {
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  subject_id: string;
  page?: number;
  page_size?: number;
}): Promise<GetTakeAttendanceBootstrapResponse> => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/take-attendance/bootstrap/?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getAssignedSubjects = async (): Promise<{success: boolean;message?: string;data?: FacultyAssignment[];}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assigned-subjects/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForRegular = async (params: {branch_id: string;semester_id: string;section_id: string;subject_id: string;page?: number;page_size?: number;}) => {
  try {
    // Client-side guard: ensure required params are present to avoid backend 400s
    if (!params.subject_id || !params.branch_id || !params.semester_id || !params.section_id) {
      return { success: false, message: 'subject_id, branch_id, semester_id and section_id required', data: { students: [] } };
    }
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/regular/?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForElective = async (params: {subject_id: string;branch_id: string;semester_id: string;section_id?: string;lab_batch_id?: string | number;page?: number;page_size?: number;}) => {
  try {
    // Elective requires subject_id, branch_id and semester_id
    if (!params.subject_id || !params.branch_id || !params.semester_id) {
      return { success: false, message: 'subject_id, branch_id and semester_id required', data: { students: [] } };
    }
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/elective/?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForOpenElective = async (params: {subject_id: string;branch_id?: string;semester_id?: string;section_id?: string;page?: number;page_size?: number;}) => {
  try {
    // Open elective requires at least subject_id
    if (!params.subject_id) {
      return { success: false, message: 'subject_id required', data: { students: [] } };
    }
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/open-elective/?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

export const getSubjectDetail = async (subject_id: string): Promise<{success: boolean;message?: string;data?: {id: number;name: string;subject_type: string;subject_code?: string;semester_id?: number | null;branch_id?: number | null;};}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/common/subject-detail/?subject_id=${encodeURIComponent(subject_id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

export const getUploadMarksBootstrap = async (params: {
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  subject_id: string;
  test_number: number;
  page?: number;
  page_size?: number;
}): Promise<GetUploadMarksBootstrapResponse> => {
  try {
    const query = new URLSearchParams();
    const entries: Record<string, any> = {
      branch_id: params.branch_id,
      semester_id: params.semester_id,
      section_id: params.section_id,
      subject_id: params.subject_id,
      test_number: params.test_number,
      page: params.page,
      page_size: params.page_size
    };
    Object.entries(entries).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/upload-marks/bootstrap/?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

interface ManageStudentLeaveRequest {
  leave_id: string;
  action: "APPROVE" | "REJECT" | "FORWARD" | "FORWARD_TO_HOD";
  remarks?: string;
  rejection_reason?: string;
}

interface ManageStudentLeaveResponse {
  success: boolean;
  message?: string;
}

export const manageStudentLeave = async (
data: ManageStudentLeaveRequest)
: Promise<ManageStudentLeaveResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/manage-student-leave/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export interface ProctorStudentLeave {
  id: string;
  student_name: string;
  usn: string;
  start_date: string | null;
  end_date: string | null;
  reason: string;
  status: "PENDING" | "FORWARDED_TO_HOD" | "APPROVED" | "REJECTED" | string;
  proctor_remarks?: string;
  forwarded_at?: string | null;
  forwarded_by?: string | null;
  hod_remarks?: string;
  hod_reviewed_at?: string | null;
  hod_reviewed_by?: string | null;
  submitted_at: string | null;
  submitted_at_raw: string | null;
  reviewed_at_raw: string | null;
  reviewed_by: string | null;
}

export interface GetProctorStudentLeavesResponse {
  success: boolean;
  message?: string;
  data?: ProctorStudentLeave[];
  pagination?: {
    page: number;
    page_size: number;
    total_pages: number;
    total_count: number;
  };
}

export const getProctorStudentLeaves = async (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  count_only?: boolean;
}): Promise<GetProctorStudentLeavesResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'All') queryParams.append('status', params.status);
    if (params?.count_only) queryParams.append('count_only', 'true');
    const url = `${API_ENDPOINT}/faculty/proctor-student-leaves/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Faculty Attendance API functions
export type WorkflowMode = 'full_day' | 'half_day_split' | 'periodic';

export interface TimeWindowSpec {
  start: string;
  end: string;
}

export interface CategoryWorkflowConfig {
  mode: WorkflowMode;
  strict_window: boolean;
  full_day: {
    check_in: TimeWindowSpec;
    check_out: TimeWindowSpec;
  };
  half_day_split: {
    first_half_in: TimeWindowSpec;
    first_half_out: TimeWindowSpec;
    second_half_in: TimeWindowSpec;
    second_half_out: TimeWindowSpec;
  };
  periodic_count: number;
  periodic_windows: TimeWindowSpec[];
}

export interface CategoryAttendanceWorkflows {
  teaching?: CategoryWorkflowConfig;
  non_teaching?: CategoryWorkflowConfig;
  admin_branch?: CategoryWorkflowConfig;
}

export interface MarkFacultyAttendanceRequest {
  status?: "present" | "absent";
  action?: "check_in" | "check_out" | "first_half_in" | "first_half_out" | "second_half_in" | "second_half_out";
  notes?: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  device_info?: any;
  off_campus_reason?: string;
}

export interface MarkFacultyAttendanceResponse {
  success: boolean;
  message?: string;
  error_code?: string;
  allow_self_declaration?: boolean;
  location?: AttendanceLocation;
  data?: {
    id: string;
    date: string;
    status: string;
    marked_at: string;
    updated?: boolean;
  };
}

export interface FacultyAttendanceRecord {
  id: string;
  date: string;
  status: string;
  marked_at: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  first_check_in?: string | null;
  first_check_out?: string | null;
  second_check_in?: string | null;
  second_check_out?: string | null;
  staff_category?: string | null;
  total_hours?: string | null;
  notes: string;
  location?: AttendanceLocation | null;
  checkin_timestamps?: string[] | null;
  delays?: number[] | null;
  periodic_checkin_count?: number;
  checkin_windows?: {start: string, end: string}[] | null;
  strict_checkin_window?: boolean;
  category_attendance_workflows?: CategoryAttendanceWorkflows | null;
}

export interface AttendanceLocation {
  latitude?: number | null;
  longitude?: number | null;
  inside?: boolean | null;
  distance_meters?: number | null;
  campus_name?: string | null;
}

export interface GetFacultyAttendanceRecordsResponse {
  success: boolean;
  message?: string;
  data?: FacultyAttendanceRecord[];
  summary?: {
    total_days: number;
    present_days: number;
    absent_days: number;
    attendance_percentage: number;
  };
  pagination?: {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const markFacultyAttendance = async (
data: MarkFacultyAttendanceRequest)
: Promise<MarkFacultyAttendanceResponse> => {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
    };
    const bodyPayload = JSON.stringify(data);
    if (bodyPayload) headers['Content-Type'] = 'application/json';

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/mark-attendance/`, {
      method: "POST",
      headers,
      body: bodyPayload
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFacultyAttendanceRecords = async (params?: {
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}): Promise<GetFacultyAttendanceRecordsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.page_size) queryParams.append("page_size", String(params.page_size));

    const url = `${API_ENDPOINT}/faculty/my-attendance-records/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// IA Marks APIs
export interface CreateQPRequest {
  branch: number;
  semester: number;
  section: number;
  subject: number;
  test_type: string;
  questions_data: Array<{
    question_number: string;
    co: string;
    blooms_level: string;
    subparts_data: Array<{
      subpart_label: string;
      content: string;
      max_marks: number;
    }>;
  }>;
}

export interface QPResponse {
  success: boolean;
  data?: any;
  errors?: any;
}

export interface StudentsForMarksResponse {
  success: boolean;
  data?: Array<{
    id: number;
    name: string;
    usn: string;
    branch_id?: number | null;
    branch?: string | null;
    semester_id?: number | null;
    semester?: number | null;
    existing_mark?: {
      marks_detail: Record<string, number>;
      total_obtained: number;
    };
  }>;
  question_paper?: number;
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface UploadIAMarksRequest {
  question_paper_id: number;
  marks_data: Array<{
    student_id: number;
    marks_detail: Record<string, number>;
    total_obtained: number;
  }>;
}

export const createQuestionPaper = async (data: CreateQPRequest): Promise<QPResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/qps/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export interface GetQPsParams {
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  test_type?: string;
  qp_id?: string | number;
  detail?: boolean;
  approved_only?: boolean;
  mine_only?: boolean;
}

export const getQuestionPapers = async (params: GetQPsParams = {}): Promise<any> => {
  try {
    // If caller is not requesting a specific qp (`qp_id`), require branch, subject and test_type
    // to avoid unnecessary empty calls from pages before filters are selected.
    if (!params.qp_id) {
      if (!params.branch_id || !params.subject_id || !params.test_type) {
        return { success: true, data: [] };
      }
    }
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'detail') {
        query.append('detail', String(Boolean(v)));
        return;
      }
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });

    const url = `${API_ENDPOINT}/faculty/qps/${query.toString() ? '?' + query.toString() : ''}`;
    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export const getQuestionPaperDetail = async (id: number): Promise<any> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/qps/?qp_id=${id}&detail=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export const getStudentsForMarks = async (params: {
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  test_type?: string;
  page?: number;
  page_size?: number;
}): Promise<StudentsForMarksResponse> => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      query.append(k, s);
    });
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students-for-marks/?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export const uploadIAMarks = async (data: UploadIAMarksRequest): Promise<any> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/upload-ia-marks/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export const updateQuestionPaper = async (id: number, data: CreateQPRequest): Promise<QPResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/qps/${id}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false };
  }
};

export const submitQPForApproval = async (qpId: number, comment?: string): Promise<{success: boolean;message: string;}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/qps/${qpId}/submit/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
      },
      body: JSON.stringify({ comment: comment || "" })
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.message || (response.ok ? "QP submitted for approval" : "Failed to submit QP")
    };
  } catch (error) {

    return {
      success: false,
      message: "Network error while submitting QP"
    };
  }
};

export const getCOAttainment = async (params: {
  subject_id?: number;
  question_paper_id?: number;
  batch_id?: number;
  target_pct?: number;
  indirect_attainment?: string;
}) => {
  try {
    const query = new URLSearchParams();
    if (params.subject_id) query.append('subject_id', params.subject_id.toString());
    if (params.question_paper_id) query.append('question_paper', params.question_paper_id.toString());
    if (params.batch_id) query.append('batch_id', params.batch_id.toString());
    if (params.target_pct) query.append('target_pct', params.target_pct.toString());
    if (params.indirect_attainment) query.append('indirect_attainment', params.indirect_attainment);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/co-attainment/?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error while fetching CO attainment" };
  }
};

export interface SyllabusDayPlan {
  day: number;
  day_name?: string;
  topic: string;
  hours?: number;
}

export interface SyllabusDayLog {
  day: number;
  day_name?: string;
  topic_covered: string;
  date?: string;
  is_completed: boolean;
  notes?: string;
}

export interface SyllabusStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    subject_id: number;
    subject_name: string;
    total_weeks: number;
    completed_weeks: number;
    progress_percentage: number;
    has_section?: boolean;
    is_elective?: boolean;
    survey_stats?: {
      total_responses: number;
      average_rating: number;
      question_averages: { [key: string]: number };
    };
    weeks: Array<{
      week: number;
      expected_topics: string;
      days?: SyllabusDayPlan[];
      is_completed: boolean;
      topics_covered: string;
      daily_logs?: SyllabusDayLog[];
      completed_date: string | null;
      faculty_name: string;
      notes: string;
      has_progress?: boolean;
      progress_details?: string[];
    }>;
  };
}

export const getSyllabusStatus = async (params: {
  subject_id: string;
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  batch_id?: string;
}): Promise<SyllabusStatusResponse> => {
  try {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/status/?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while fetching syllabus status" };
  }
};

export const exportSyllabusPdf = async (params: {
  subject_id: string;
  branch_id: string;
  semester_id: string;
  section_id: string;
  batch_id?: string;
}): Promise<Blob> => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/export_pdf/?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    }
  });
  if (!response.ok) {
    throw new Error("Failed to export syllabus PDF");
  }
  return response.blob();
};

export const updateSyllabusPlan = async (data: {
  subject_id: string;
  plan_data: Array<{ week: number; topics: string; days?: SyllabusDayPlan[] }>;
}): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/plan/update/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while updating syllabus plan" };
  }
};

export const updateSyllabusProgress = async (data: {
  subject_id: string;
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  batch_id: string;
  week_number: number;
  is_completed: boolean;
  topics_covered: string;
  notes: string;
  daily_logs?: SyllabusDayLog[];
}): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/progress/update/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while updating syllabus progress" };
  }
};

export const getSyllabusBootstrap = async (branchId?: string): Promise<{
  success: boolean;
  is_hod?: boolean;
  semesters?: Array<{ id: number; number: number }>;
  subjects?: Array<{ id: number; name: string; subject_code: string; semester_id: number; subject_type: string }>;
  sections?: Array<{ id: number; name: string; semester_id: number }>;
  message?: string;
}> => {
  try {
    const query = branchId ? `?branch_id=${branchId}` : "";
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/bootstrap/${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while fetching syllabus bootstrap" };
  }
};

export interface SemesterSyllabusMonitorResponse {
  success: boolean;
  message?: string;
  semester_number?: number;
  semester_id?: number;
  semesters?: { id: number; number: number }[];
  subjects?: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    subject_type: string;
    total_weeks: number;
    avg_progress: number;
    sections_progress: {
      section_name: string;
      section_id: number;
      faculty_name: string;
      completed_weeks: number;
      total_weeks: number;
      progress_percentage: number;
    }[];
  }[];
}

export const getSemesterSyllabusMonitor = async (batchId: string, semesterId?: string, branchId?: string): Promise<SemesterSyllabusMonitorResponse> => {
  try {
    let query = `?batch_id=${batchId}`;
    if (semesterId) query += `&semester_id=${semesterId}`;
    if (branchId) query += `&branch_id=${branchId}`;
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/semester-monitor/${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while fetching semester syllabus monitor data" };
  }
};

export interface SubjectSyllabusMonitorResponse {
  success: boolean;
  message?: string;
  subject_id?: number;
  sections_progress?: Array<{
    section_name: string;
    section_id: number | null;
    faculty_name: string;
    completed_weeks: number;
    total_weeks: number;
    progress_percentage: number;
  }>;
}

export const getSubjectSyllabusMonitor = async (batchId: string, semesterId: string, subjectId: string): Promise<SubjectSyllabusMonitorResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/subject-monitor/?batch_id=${batchId}&semester_id=${semesterId}&subject_id=${subjectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while fetching subject section progress data" };
  }
};

export interface SectionWeekProgressResponse {
  success: boolean;
  message?: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  section_id?: string | null;
  total_weeks?: number;
  completed_weeks?: number;
  progress_percentage?: number;
  weeks?: Array<{
    week: number;
    expected_topics: string;
    days?: SyllabusDayPlan[];
    is_completed: boolean;
    topics_covered: string;
    daily_logs?: SyllabusDayLog[];
    completed_date: string | null;
    faculty_name: string;
    notes: string;
  }>;
  week_detail?: {
    week: number;
    expected_topics: string;
    days?: SyllabusDayPlan[];
    is_completed: boolean;
    topics_covered: string;
    daily_logs?: SyllabusDayLog[];
    completed_date: string | null;
    faculty_name: string;
    notes: string;
  } | null;
}

export const getSectionWeekProgress = async (params: {
  subject_id: string;
  section_id?: string | null;
  batch_id?: string | null;
  week_number?: number;
}): Promise<SectionWeekProgressResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("subject_id", params.subject_id);
    if (params.section_id !== undefined && params.section_id !== null) {
      queryParams.append("section_id", params.section_id);
    }
    if (params.batch_id) {
      queryParams.append("batch_id", params.batch_id);
    }
    if (params.week_number) {
      queryParams.append("week_number", String(params.week_number));
    }

    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/faculty/syllabus/section-week-progress/?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        }
      }
    );
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error while fetching section week progress" };
  }
};

export const exportSemesterSyllabusMonitorPdf = async (batchId: string, semesterId: string, branchId?: string): Promise<Blob> => {
  let query = `batch_id=${batchId}&semester_id=${semesterId}`;
  if (branchId) query += `&branch_id=${branchId}`;
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/semester-monitor/export-pdf/?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    }
  });
  if (!response.ok) {
    throw new Error("Failed to export semester syllabus monitor PDF");
  }
  return response.blob();
};

export const exportSubjectSyllabusMonitorPdf = async (batchId: string, semesterId: string, subjectId: string): Promise<Blob> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/syllabus/subject-monitor/export-pdf/?batch_id=${batchId}&semester_id=${semesterId}&subject_id=${subjectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    }
  });
  if (!response.ok) {
    throw new Error("Failed to export subject syllabus monitor PDF");
  }
  return response.blob();
};

// ─── Employee Reimbursements & Claims ────────────────────────────────────────

export const getMyReimbursements = async (page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/payroll/reimbursements/?page=${page}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return { success: true, ...data };
  } catch {
    return { success: false, message: 'Network error fetching reimbursement claims' };
  }
};

export const submitReimbursementClaim = async (payload: {
  type: string;
  amount: number;
  description: string;
  receipt_file?: string;
}) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/payroll/reimbursements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return { success: data.success ?? response.ok, ...data };
  } catch {
    return { success: false, message: 'Network error submitting reimbursement claim' };
  }
};

// --- Faculty Payroll Endpoints ---

export const getEmployeePayslips = async (page: number = 1) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/payroll/payslips/?page=${page}`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching payslips' };
  }
};

export const downloadEmployeePayslip = async (payslipId: number, filename: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/payroll/payslips/?download_id=${payslipId}`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } else {
      return { success: false, message: 'Failed to download PDF payslip' };
    }
  } catch (error) {
    return { success: false, message: 'Network error downloading PDF' };
  }
};

export const getEmployeePfEsiSummary = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/payroll/pf-esi-summary/`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching PF/ESI summary' };
  }
};


// --- Course Exit Survey Endpoints ---

export const toggleCourseExitSurvey = async (subjectId: string, active: boolean) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/syllabus/toggle-survey/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subject_id: subjectId, active })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error toggling course exit survey' };
  }
};

export const getStudentCourseExitSurveys = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/course-exit-surveys/`, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error fetching active course exit surveys' };
  }
};

export const submitCourseExitSurvey = async (subjectId: string, ratings: { [key: string]: number }) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/course-exit-surveys/submit/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subject_id: subjectId, ratings })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Network error submitting course exit survey' };
  }
};



export const updateAttendanceRecord = async (
  recordId: number,
  updates: Array<{ id: number; status: boolean }>
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/${recordId}/update/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ updates })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};
