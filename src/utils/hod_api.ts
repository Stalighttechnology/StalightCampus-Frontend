import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Type definitions for request and response data
interface HODStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    faculty_count: number;
    student_count: number;
    pending_leaves: number;
    average_attendance: number;
    attendance_trend: Array<{
      week: string;
      start_date: string;
      end_date: string;
      attendance_percentage: number;
    }>;
    unread_announcement_count?: number;
  };
}

interface LowAttendanceResponse {
  success: boolean;
  message?: string;
  data?: {
    students: Array<{
      student_id: string;
      name: string;
      usn: string;
      attendance_percentage: number;
      total_sessions: number;
      present_sessions: number;
      semester: number | null;
      section: string | null;
      batch: string;
      subject: string;
    }>;
  };
}

interface Semester {
  id: string;
  number: number;
}

interface GetSemestersResponse {
  success: boolean;
  message?: string;
  data?: Semester[];
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface GetSectionsResponse {
  success: boolean;
  message?: string;
  data?: Section[];
}

interface Branch {
  id: string;
  name: string;
}

interface GetBranchesResponse {
  success: boolean;
  message?: string;
  data?: Branch[];
}

interface GetAttendanceBootstrapResponse {
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    profile: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    branches: Branch[];
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string }>;
    subjects: Array<{ id: string; name: string; subject_code: string; semester_id: string }>;
    attendance: {
      students: Array<{
        student_id: string;
        name: string;
        usn: string;
        attendance_percentage: number | string;
        total_sessions: number;
        present_sessions: number;
        semester: number | null;
        section: string | null;
        batch: string | null;
        subject: string;
      }>;
    };
  };
}

interface Batch {
  id: string;
  name: string;
  start_year: number;
  end_year: number;
  student_count: number;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
}

interface GetStudentOptionsResponse {
  success: boolean;
  message?: string;
  data?: {
    batches: Batch[];
    courses: Course[];
    semesters: Semester[];
    sections: Section[];
  };
}

interface Faculty {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface GetFacultiesResponse {
  success: boolean;
  message?: string;
  data?: Faculty[];
}

interface ManageSemestersRequest {
  action: "create" | "update" | "delete";
  semester_id?: string;
  number?: number;
  branch_id: string;
}

interface ManageSemestersResponse {
  success: boolean;
  message?: string;
}

interface ManageSectionsRequest {
  action: "create" | "update" | "delete";
  section_id?: string;
  name?: string;
  semester_id?: string;
  branch_id: string;
}

interface ManageSectionsResponse {
  success: boolean;
  message?: string;
  data?: { id: string; name: string; semester_id: string };
}

interface ManageStudentsRequest {
  action: "create" | "update" | "delete" | "bulk_update" | "register_subjects" | "bulk_register_subjects" | "bulk_unregister_subjects";
  student_id?: string;
  usn?: string;
  name?: string;
  email?: string;
  phone?: string;
  semester_id?: string;
  section_id?: string;
  branch_id: string;
  batch_id?: string;
  course_id?: string;
  cycle?: string;
  parent_name?: string;
  parent_contact?: string;
  emergency_contact?: string;
  blood_group?: string;
  mode_of_admission?: string;
  date_of_admission?: string;
  subject_ids?: string[];
  subject_id?: string;
  student_ids?: string[];
  bulk_data?: Array<{
    usn: string;
    name: string;
    email: string;
    phone?: string;
    batch_id?: string;
    course_id?: string;
    cycle?: string;
    parent_name?: string;
    parent_contact?: string;
    emergency_contact?: string;
    blood_group?: string;
    mode_of_admission?: string;
    date_of_admission?: string;
  }>;
  page?: number;
  page_size?: number;
}

interface ManageStudentsResponse {
  // For GET requests (DRF pagination)
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Array<{
    student_id: string;
    usn: string;
    name: string;
    email: string | null;
    phone: string;
    semester: string;
    section: string | null;
    batch: string | null;
    mode_of_admission?: string;
    cycle?: string;
    course: string | null;
    proctor: string | null;
    date_of_admission: string | null;
    parent_name: string;
    parent_contact: string;
    emergency_contact: string;
    blood_group: string;
    cycle: string;
  }>;
  // For POST requests (actions)
  success?: boolean;
  message?: string;
  data?: { student_id: string } | { created_count: number; updated_count: number } | { registered_count?: number; removed_count?: number; failed?: any[] };
}

interface ManageBatchesRequest {
  start_year?: number;
  end_year?: number;
}

interface ManageBatchesResponse {
  success: boolean;
  message?: string;
  batches?: Batch[];
  batch?: Batch;
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string;
  subject_type: string;
}

interface GetSubjectsResponse {
  success: boolean;
  message?: string;
  data?: Subject[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  current_page?: number;
  total_pages?: number;
}

interface ManageSubjectsRequest {
  action: "create" | "update" | "delete";
  subject_id?: string;
  name: string;
  subject_code?: string;
  semester_id: string;
  branch_id: string;
  subject_type?: string;
}

interface ManageSubjectsResponse {
  success: boolean;
  message?: string;
  data?: { subject_id: string; subject_code: string };
}

interface FacultyAssignment {
  id: string;
  faculty: string;
  subject: string;
  semester: number;
  section: string;
  faculty_id: string;
  subject_id: string;
  semester_id: string;
  section_id: string;
}

interface ManageFacultyAssignmentsRequest {
  action?: "create" | "update" | "delete";
  assignment_id?: string;
  faculty_id?: string;
  subject_id?: string;
  semester_id?: string;
  section_id?: string;
  branch_id: string;
}

interface ManageFacultyAssignmentsResponse {
  success: boolean;
  message?: string;
  data?: { assignments?: FacultyAssignment[]; assignment_id?: string };
}

interface TimetableEntry {
  id: string;
  faculty_assignment: {
    id: string;
    faculty: string;
    subject: string;
    semester: number;
    section: string;
  };
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface ManageTimetableRequest {
  action: "create" | "update" | "delete" | "bulk_create" | "GET";
  timetable_id?: string;
  assignment_id?: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  semester_id: string;
  section_id: string;
  branch_id: string;
  file?: File;
}

interface ManageTimetableResponse {
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: { timetable_id?: string; created_count?: number; errors?: string[] } | TimetableEntry[];
}

interface Leave {
  id: string;
  title: string;
  date: string;
  reason: string;
  status: string;
}

interface ManageHODLeavesRequest {
  branch_id: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

interface ManageHODLeavesResponse {
  success: boolean;
  message?: string;
  data?: Leave[] | Leave;
}

interface ManageLeavesRequest {
  branch_id: string;
  action?: "update";
  leave_id?: string;
  status?: "APPROVED" | "REJECTED";
}

interface ManageLeavesResponse {
  success: boolean;
  message?: string;
  data?: { leaves?: Leave[]; leave_id?: string; status?: string };
}

interface GetAttendanceParams {
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  branch_id: string;
}

interface AttendanceRecord {
  id: string;
  subject: string;
  semester: number;
  section: string;
  date: string;
}

interface GetAttendanceResponse {
  success: boolean;
  message?: string;
  data?: { records: AttendanceRecord[] };
}

interface GetMarksParams {
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  branch_id: string;
}

interface TestMark {
  test_number: number;
  mark: number;
  max_mark: number;
}

interface Mark {
  student_id: string;
  student: string;
  usn: string;
  subject: string;
  subject_id: string;
  average_mark: number;
  test_marks: TestMark[];
}

interface GetMarksResponse {
  success: boolean;
  message?: string;
  data?: { marks: Mark[] };
}

interface CreateAnnouncementRequest {
  title: string;
  content: string;
  target: "faculty" | "students" | "both";
  branch_id: string;
}

interface CreateAnnouncementResponse {
  success: boolean;
  message?: string;
  data?: { announcement_id: string };
}

interface SendNotificationRequest {
  action: "notify" | "notify_all" | "notify_low_attendance";
  title: string;
  student_id?: string;
  message: string;
  target?: "student" | "teacher" | "all";
  branch_id: string;
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  threshold?: number;
}

interface SendNotificationResponse {
  success: boolean;
  message?: string;
}

interface AssignProctorRequest {
  student_id: string;
  faculty_id: string;
  branch_id: string;
}

interface AssignProctorResponse {
  success: boolean;
  message?: string;
  data?: { student_id: string; faculty_id: string };
}

interface AssignProctorsBulkRequest {
  usns?: string[];
  student_ids?: string[];
  faculty_id: string;
  branch_id: string;
}

interface AssignProctorsBulkResponse {
  success: boolean;
  message?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  section: string | null;
  last_message: string | null;
}

interface ManageChatRequest {
  action: "create_channel" | "send_message";
  channel_id?: string;
  name?: string;
  channel_type?: "subject" | "section" | "private" | "faculty";
  subject_id?: string;
  section_id?: string;
  participant_ids?: string[];
  content?: string;
  branch_id: string;
}

interface ManageChatResponse {
  success: boolean;
  message?: string;
  data?: { channels?: ChatChannel[]; channel_id?: string; message_id?: string };
}

interface ManageProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  address?: string;
  bio?: string;
}

interface ManageProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_number: string;
    address: string;
    bio: string;
    branch: string;
    branch_id: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  role: string;
  created_at: string;
  created_by?: string;
}

interface GetNotificationsResponse {
  success: boolean;
  message?: string;
  data?: Notification[];
}

interface PromoteStudentsRequest {
  from_semester_id: string;
  to_semester_id: string;
  section_id?: string;
  branch_id: string;
  student_ids?: string[];
}

interface PromoteStudentsResponse {
  success: boolean;
  message?: string;
  promoted?: Array<{
    usn: string;
    name: string;
    from_semester: number;
    to_semester: number;
    section?: string;
  }>;
  failed?: Array<{
    usn: string;
    name: string;
    reason: string;
  }>;
}

interface PromoteSelectedStudentsRequest {
  student_ids: string[];
  to_semester_id: string;
  branch_id: string;
}

interface PromoteSelectedStudentsResponse {
  success: boolean;
  message?: string;
  promoted?: Array<{
    usn: string;
    name: string;
    from_semester: number;
    to_semester: number;
    section?: string;
  }>;
  failed?: Array<{
    usn: string;
    name: string;
    reason: string;
  }>;
}

interface DemoteStudentRequest {
  student_id: string;
  to_semester_id: string;
  branch_id: string;
  reason: string;
  remarks?: string;
  section_id?: string;
}

interface DemoteStudentResponse {
  success: boolean;
  message?: string;
  data?: {
    student_usn: string;
    student_name: string;
    from_semester: number;
    to_semester: number;
    reason: string;
    remarks: string;
    section?: string;
  };
}

interface BulkDemoteStudentsRequest {
  student_ids: string[];
  to_semester_id: string;
  branch_id: string;
  reason: string;
  remarks?: string;
  section_id?: string;
}

interface BulkDemoteStudentsResponse {
  success: boolean;
  message?: string;
  data?: {
    demoted_students: Array<{
      usn: string;
      name: string;
      from_semester: number;
      to_semester: number;
      section?: string;
    }>;
    failed_students: Array<{
      usn: string;
      name: string;
      reason: string;
    }>;
    demoted_count: number;
    failed_count: number;
    target_semester: number;
  };
}

interface PromotionEligibility {
  student_id: string;
  usn: string;
  name: string;
  is_eligible: boolean;
  failed_subjects: string[];
  attendance_percentage: number;
}

interface GetPromotionEligibilityParams {
  semester_id: string;
  section_id?: string;
  branch_id: string;
}

interface GetPromotionEligibilityResponse {
  success: boolean;
  message?: string;
  data?: { students: PromotionEligibility[] };
}

interface ExamFailure {
  id: string;
  student_id: string;
  usn: string;
  name: string;
  subject_id: string;
  subject_name: string;
  semester_id: string;
  semester_number: number;
  failure_date: string;
}

interface GetExamFailuresParams {
  semester_id?: string;
  section_id?: string;
  subject_id?: string;
  branch_id: string;
}

interface GetExamFailuresResponse {
  success: boolean;
  message?: string;
  data?: { failures: ExamFailure[] };
}

interface RecordExamFailureRequest {
  student_id: string;
  subject_id: string;
  semester_id: string;
  branch_id: string;
  failure_date: string;
}

interface RecordExamFailureResponse {
  success: boolean;
  message?: string;
  data?: { failure_id: string };
}

interface UploadStudyMaterialRequest {
  title: string;
  subject_name?: string;
  subject_code?: string;
  semester_id: string;
  branch_id: string;
  section_id?: string;
  file: File;
}

interface StudyMaterial {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  semester_id: string;
  branch_id: string;
  section_id?: string | null;
  section?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  file_url: string;
}

interface UploadStudyMaterialResponse {
  success: boolean;
  message?: string;
  data?: StudyMaterial;
}

interface GetStudyMaterialsResponse {
  success: boolean;
  message?: string;
  data?: StudyMaterial[];
}

interface StudentPerformance {
  student_id: string;
  usn: string;
  name: string;
  subject: string;
  attendance_percentage: number;
  average_mark: number;
  semester: number;
  batch: string;
  test_marks?: TestMark[];
}

// Utility function for error handling
const handleApiError = (error: unknown, response?: Response): { success: boolean; message: string } => {
  console.error("API Error:", error);
  if (response?.status === 404) {
    return { success: false, message: `Resource not found: Invalid ID or endpoint (Status: 404)` };
  } else if (response?.status === 403) {
    return { success: false, message: "Access denied: Invalid or missing authentication token (Status: 403)" };
  } else if (response?.status === 400) {
    return { success: false, message: (error as Error).message || "Invalid request data (Status: 400)" };
  } else if (response?.status === 500) {
    return { success: false, message: "Server error: Please try again later (Status: 500)" };
  } else if ((error as Error).message?.includes("Unexpected token")) {
    return { success: false, message: "Server returned invalid response (possibly HTML instead of JSON)" };
  }
  return { success: false, message: (error as Error).message || "Network error or server issue" };
};

// API functions
export const getBranches = async (): Promise<GetBranchesResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/branches/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

interface GetLeaveBootstrapResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    success: boolean;
    message?: string;
    data?: {
      profile: {
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        mobile_number: string;
        address: string;
        bio: string;
        branch: string;
        branch_id: string;
      };
      leaves: Array<{
        id: number;
        faculty_name: string;
        department: string;
        start_date: string;
        end_date: string;
        reason: string;
        status: string;
      }>;
    };
  };
  // Fallback for non-paginated responses
  success?: boolean;
  message?: string;
  data?: any;
}

export const getLeaveBootstrap = async (
  branch_id?: string
): Promise<GetLeaveBootstrapResponse> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/leave-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getFacultyLeavesBootstrap = async (
  branch_id?: string,
  filters?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }
): Promise<GetLeaveBootstrapResponse> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    if (filters?.status && filters.status !== 'All') params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.page) params.page = filters.page.toString();
    if (filters?.page_size) params.page_size = filters.page_size.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/faculty-leaves-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

interface GetProctorBootstrapResponse {
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    profile: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    students: Array<{
      usn: string;
      name: string;
      semester: number | null;
      branch: string;
      section: string | null;
      proctor: string | null;
    }>;
    proctors: Array<{
      id: string;
      name: string;
      first_name: string;
      last_name: string;
    }>;
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string }>;
  };
}

export const getProctorBootstrap = async (
  branch_id?: string
): Promise<GetProctorBootstrapResponse> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctor-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getSemesterBootstrap = async (
  include: string[] = ['profile', 'semesters', 'sections', 'subjects'],
  branch_id?: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile?: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    branches?: Branch[];
    semesters?: Array<{ id: string; number: number }>;
    sections?: Array<{ id: string; name: string; semester_id: string | null }>;
    subjects?: Array<{ id: string; name: string; subject_code: string; semester_id: string | null }>;
  };
}> => {
  try {
    const params: Record<string, string> = {};
    params.include = include.join(',');
    if (branch_id) params.branch_id = branch_id;
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/semester-bootstrap/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getElectiveEnrollmentBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      branch: string;
      branch_id: string;
    };
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string | null }>;
    elective_subjects: Array<{
      id: string;
      name: string;
      subject_code: string;
      semester_id: string | null;
      subject_type: string;
      credits: number;
    }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/elective-enrollment-bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

const hodStatsPromises: Record<string, { promise: Promise<HODStatsResponse>, timestamp: number }> = {};

export const getHODStats = async (branch_id: string = ''): Promise<HODStatsResponse> => {
  
  const now = Date.now();
  const cached = hodStatsPromises[branch_id];
  if (cached && now - cached.timestamp < 5000) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/dashboard-stats/?branch_id=${branch_id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return await response.json();
    } catch (error: unknown) {
      return handleApiError(error, (error as any).response);
    }
  })();

  hodStatsPromises[branch_id] = { promise, timestamp: now };
  return promise;
};

// Combined HOD dashboard (stats + leaves in one call)
export const getHODDashboard = async (
  branch_id: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    overview?: {
      faculty_count: number;
      student_count: number;
      pending_leaves: number;
    };
    attendance_trend?: Array<{
      week: string;
      start_date: string;
      end_date: string;
      attendance_percentage: number;
    }>;
    leaves?: Array<any>;
  };
}> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/dashboard/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};

// Combined HOD dashboard bootstrap (profile + stats + leaves in one call)
export const getHODDashboardBootstrap = async (
  include: string[] = ['profile', 'overview', 'attendance_trend', 'leaves', 'semesters', 'sections']
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile?: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    semesters?: Array<{ id: string; number: number }>;
    sections?: Array<{ id: string; name: string; semester_id: string | null }>;
    overview?: {
      faculty_count: number;
      student_count: number;
      pending_leaves: number;
    };
    attendance_trend?: Array<{
      week: string;
      start_date: string;
      end_date: string;
      attendance_percentage: number | string;
    }>;
    leaves?: Array<{
      id: number;
      faculty_name: string;
      department: string;
      start_date: string;
      end_date: string;
      reason: string;
      status: string;
    }>;
    faculty_attendance_today?: {
      summary: {
        total_faculty: number;
        present: number;
        absent: number;
        not_marked: number;
      };
    };
  };
}> => {
  try {
    const params: Record<string, string> = {};
    params.include = include.join(',');
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/dashboard/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};

export const getLowAttendanceBootstrap = async (
  branch_id?: string,
  filters: { semester_id?: string; section_id?: string; subject_id?: string; threshold?: number; page?: number; page_size?: number } = {}
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    profile: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string }>;
    subjects: Array<{ id: string; name: string; subject_code: string; semester_id: string }>;
    low_attendance: {
      students: Array<{
        student_id: string;
        usn: string;
        name: string;
        attendance_percentage: number;
        total_sessions: number;
        present_sessions: number;
        semester: number | null;
        section: string | null;
        batch: string | null;
        subject: string;
      }>;
    };
    pagination: {
      page: number;
      page_size: number;
      total_students: number;
      total_pages: number;
    };
  };
}> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    if (filters.semester_id) params.semester_id = filters.semester_id;
    if (filters.section_id) params.section_id = filters.section_id;
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.threshold) params.threshold = filters.threshold.toString();
    if (filters.page) params.page = filters.page.toString();
    if (filters.page_size) params.page_size = filters.page_size.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/low-attendance-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getLowAttendanceStudents = async (
  branch_id?: string,
  filters: { semester_id?: string; section_id?: string; subject_id?: string; threshold?: number; page?: number; page_size?: number } = {}
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    students: Array<{
      student_id: string;
      usn: string;
      name: string;
      attendance_percentage: number;
      total_sessions: number;
      present_sessions: number;
      semester: number | null;
      section: string | null;
      batch: string | null;
      subject: string;
    }>;
  };
}> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    if (filters.semester_id) params.semester_id = filters.semester_id;
    if (filters.section_id) params.section_id = filters.section_id;
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.threshold) params.threshold = filters.threshold.toString();
    if (filters.page) params.page = filters.page.toString();
    if (filters.page_size) params.page_size = filters.page_size.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/low-attendance-students/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getAttendanceBootstrap = async (
  branch_id?: string,
  filters: { semester_id?: string; section_id?: string; subject_id?: string; page?: number; page_size?: number } = {}
): Promise<GetAttendanceBootstrapResponse> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    if (filters.semester_id) params.semester_id = filters.semester_id;
    if (filters.section_id) params.section_id = filters.section_id;
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.page) params.page = filters.page.toString();
    if (filters.page_size) params.page_size = filters.page_size.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/attendance-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getMarksBootstrap = async (
  branch_id?: string,
  filters: { semester_id?: string; section_id?: string; subject_id?: string; page?: number; page_size?: number } = {}
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    profile: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      mobile_number: string;
      address: string;
      bio: string;
      branch: string;
      branch_id: string;
    };
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string }>;
    subjects: Array<{ id: string; name: string; subject_code: string; semester_id: string }>;
    performance: Array<{
      subject: string;
      marks: number;
      attendance: number;
      semester: string;
    }>;
    marks: Array<{
      student_id: string;
      student: string;
      usn: string;
      subject: string;
      subject_id: string;
      average_mark: number;
      test_marks: Array<{
        test_number: number;
        mark: number;
        max_mark: number;
      }>;
    }>;
    pagination: {
      page: number;
      page_size: number;
      total_students: number;
      total_pages: number;
    };
  };
}> => {
  try {
    const params: Record<string, string> = {};
    if (branch_id) params.branch_id = branch_id;
    if (filters.semester_id) params.semester_id = filters.semester_id;
    if (filters.section_id) params.section_id = filters.section_id;
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.page) params.page = filters.page.toString();
    if (filters.page_size) params.page_size = filters.page_size.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/marks-bootstrap/${query ? '?' + query : ''}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getStudentOptions = async (branch_id: string): Promise<GetStudentOptionsResponse> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/student-options/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getSemesters = async (branch_id: string): Promise<GetSemestersResponse> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/semesters/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageSemesters = async (data: ManageSemestersRequest): Promise<ManageSemestersResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    if (data.action === "create" && !data.number) throw new Error("Semester number is required for create action");
    if (data.action === "update" && (!data.semester_id || !data.number)) throw new Error("Semester ID and number are required for update action");
    if (data.action === "delete" && !data.semester_id) throw new Error("Semester ID is required for delete action");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/semesters/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageSections = async (
  data: ManageSectionsRequest | { branch_id: string; semester_id?: string },
  method: "GET" | "POST" = "GET"
): Promise<GetSectionsResponse> => {
  try {
    const branch_id = (data as { branch_id: string }).branch_id;
    if (!branch_id) throw new Error("Branch ID is required");
    let url = `${API_ENDPOINT}/hod/sections/?branch_id=${branch_id}`;
    if (method === "GET" && (data as any).semester_id) {
      url += `&semester_id=${(data as any).semester_id}`;
    }
    if (method === "POST") {
      const req = data as ManageSectionsRequest;
      if (!req.action) throw new Error("Action is required for POST requests");
      if (req.action === "create" && (!req.name || !req.semester_id)) {
        throw new Error("Name and Semester ID are required for create action");
      }
      if (req.action === "update" && (!req.section_id || !req.name || !req.semester_id)) {
        throw new Error("Section ID, Name, and Semester ID are required for update action");
      }
      if (req.action === "delete" && !req.section_id) {
        throw new Error("Section ID is required for delete action");
      }
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

// Combined semester data: sections + subjects + faculty assignments
export const getHODTimetableSemesterData = async (semester_id: string): Promise<{
  success: boolean;
  message?: string;
  data?: {
    sections: Array<{ id: string; name: string; semester_id: string }>;
    subjects: Array<{ id: string; name: string; subject_code: string; semester_id: string }>;
    faculty_assignments: Array<{
      id: string;
      faculty: string;
      faculty_id: string;
      faculty_name: string;
      subject: string;
      subject_id: string;
      section: string;
      section_id: string;
      semester: number;
      semester_id: string;
    }>;
  };
}> => {
  try {
    if (!semester_id) throw new Error("Semester ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/timetable-semester-data/?semester_id=${semester_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};

// Combined bootstrap: profile + semesters + sections
export const getHODBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: { first_name?: string; last_name?: string; email?: string; branch?: string; branch_id: string };
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string | null }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};

// Student management bootstrap (profile + semesters + sections + batches + performance)
// Note: Students are fetched separately via manageStudents for pagination
export const getHODStudentBootstrap = async (
  include: string[] = ['profile', 'semesters', 'sections', 'batches', 'performance'],
  page?: number
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
  data?: {
    profile?: { branch_id: string };
    semesters?: Array<{ id: string; number: number }>;
    sections?: Array<{ id: string; name: string; semester_id: string | null }>;
    batches?: Array<{ id: number; name: string; start_year: number; end_year: number }>;
    performance?: Array<{ subject: string; attendance: number; marks: number; semester: string }>;
  };
}> => {
  try {
    const params: Record<string, string> = {};
    params.include = include.join(',');
    if (page) params.page = page.toString();
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/student-bootstrap/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};
export const manageSubjects = async (
  data: ManageSubjectsRequest | { branch_id: string; semester_id?: string; page?: number; page_size?: number },
  method: "GET" | "POST" = "GET"
): Promise<GetSubjectsResponse> => {
  try {
    const branch_id = (data as { branch_id: string }).branch_id;
    if (!branch_id) throw new Error("Branch ID is required");
    let url = `${API_ENDPOINT}/hod/subjects/?branch_id=${branch_id}`;
    if (method === "GET") {
      const params = new URLSearchParams({ branch_id });
      if ((data as any).semester_id) params.append("semester_id", (data as any).semester_id);
      if ((data as any).subject_type) params.append("subject_type", (data as any).subject_type);
      if ((data as any).page) params.append("page", (data as any).page.toString());
      if ((data as any).page_size) params.append("page_size", (data as any).page_size.toString());
      url = `${API_ENDPOINT}/hod/subjects/?${params.toString()}`;
    }
    if (method === "POST") {
      const req = data as ManageSubjectsRequest;
      if (!req.action) throw new Error("Action is required for POST requests");
      if (req.action === "create" && (!req.name || !req.semester_id || !req.subject_code)) {
        throw new Error("Name, Semester ID, and Subject Code are required for create action");
      }
      if (req.action === "update" && (!req.subject_id || !req.name || !req.semester_id || !req.subject_code)) {
        throw new Error("Subject ID, Name, Semester ID, and Subject Code are required for update action");
      }
      if (req.action === "delete" && !req.subject_id) {
        throw new Error("Subject ID is required for delete action");
      }
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

// Subject management bootstrap (profile + semesters)
// Use include parameter to control what data is returned
export const getHODSubjectBootstrap = async (include: string[] = ['profile', 'semesters']): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile?: { branch_id: string };
    semesters?: Array<{ id: string; number: number }>;
    subjects?: Array<{ id: string; name: string; subject_code: string; semester_id: string | null; subject_type: string }>;
    faculties?: Array<{ id: string; username: string; first_name: string; last_name: string | null }>;
    assignments?: Array<{ id: string; faculty: string; subject: string; section: string; semester: number; faculty_id: string; subject_id: string; section_id: string; semester_id: string }>;
  };
}> => {
  try {
    const includeParam = include.join(',');
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/subject-bootstrap/?include=${includeParam}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};
export const manageStudents = async (
  data: ManageStudentsRequest | { branch_id: string; semester_id?: string; section_id?: string; page?: number; page_size?: number },
  method: "GET" | "POST" = "GET"
): Promise<ManageStudentsResponse> => {
  // Simple in-memory cache to avoid immediate GET after a recent POST
  // Keyed by query string for GET requests
  const studentsCacheKey = (paramsStr: string) => `students:${paramsStr}`;
  // Load/store helpers
  const cacheStore: Map<string, any> = (manageStudents as any)._cache || new Map();
  (manageStudents as any)._cache = cacheStore;
  try {
    const branch_id = (data as { branch_id: string }).branch_id;
    if (!branch_id) throw new Error("Branch ID is required");
    let url = `${API_ENDPOINT}/hod/students/?branch_id=${branch_id}`;
    if (method === "GET") {
      const params = new URLSearchParams({ branch_id });
      if ((data as any).semester_id) params.append("semester_id", (data as any).semester_id);
      if ((data as any).section_id) params.append("section_id", (data as any).section_id);
      if ((data as any).search) params.append("search", (data as any).search);
      if ((data as any).subject_id) params.append("subject_id", (data as any).subject_id);
      if ((data as any).page) params.append("page", (data as any).page.toString());
      if ((data as any).page_size) params.append("page_size", (data as any).page_size.toString());
      url = `${API_ENDPOINT}/hod/students/?${params.toString()}`;

      // Optionally suppress immediate GETs that follow a recent POST to the students endpoint
      // If caller explicitly requests a force refresh (`force_refresh: true`) skip suppression and fetch fresh.
      const forceRefresh = !!(data as any).force_refresh;
      if (!forceRefresh) {
        const lastPost = Number(localStorage.getItem('last_students_post_ts') || '0');
        const now = Date.now();
        const key = studentsCacheKey(params.toString());
        // Try in-memory cache first
        if (lastPost && now - lastPost < 2000 && cacheStore.has(key)) {
          return cacheStore.get(key);
        }
        // Fall back to localStorage cache (across tabs/reloads)
        if (lastPost && now - lastPost < 2000) {
          try {
            const cached = localStorage.getItem(`students_cache:${params.toString()}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              cacheStore.set(key, parsed);
              return parsed;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
    if (method === "POST") {
      const req = data as ManageStudentsRequest;
      if (!req.action) throw new Error("Action is required for POST requests");
      if (req.action === "create" && (!req.usn || !req.name || !req.email || !req.semester_id || !req.section_id || !req.batch_id)) {
        throw new Error("USN, Name, Email, Semester ID, Section ID, and Batch ID are required for create action");
      }
      if (req.action === "update" && (!req.student_id || !req.name || !req.email || !req.semester_id || !req.section_id)) {
        throw new Error("Student ID, Name, Email, Semester ID, and Section ID are required for update action");
      }
      if (req.action === "delete" && !req.student_id) {
        throw new Error("Student ID is required for delete action");
      }
      if (req.action === "bulk_update") {
        if (!req.semester_id || !req.section_id) {
          throw new Error("Semester ID and Section ID are required for bulk_update action");
        }
        if (!req.bulk_data || !Array.isArray(req.bulk_data) || req.bulk_data.length === 0) {
          throw new Error("Bulk data must be a non-empty array for bulk_update action");
        }
        for (const entry of req.bulk_data) {
          if (!entry.usn || !entry.name) {
            throw new Error("Each bulk data entry must include USN and Name");
          }
        }
      }
      if (req.action === "register_subjects" && (!req.student_id || !req.subject_ids || !Array.isArray(req.subject_ids))) {
        throw new Error("Student ID and subject IDs array are required for register_subjects action");
      }
      if (req.action === "bulk_unregister_subjects") {
        if (!req.subject_id || !req.student_ids || !Array.isArray(req.student_ids) || req.student_ids.length === 0) {
          throw new Error("subject_id and student_ids array are required for bulk_unregister_subjects action");
        }
      }
      if (req.action === "bulk_register_subjects") {
        if (!req.subject_id || !req.student_ids || !Array.isArray(req.student_ids) || req.student_ids.length === 0) {
          throw new Error("subject_id and student_ids array are required for bulk_register_subjects action");
        }
      }
      if (req.action === "get_enrollment_status") {
        if (!req.subject_id || !req.student_ids || !Array.isArray(req.student_ids) || req.student_ids.length === 0) {
          throw new Error("subject_id and student_ids array are required for get_enrollment_status action");
        }
      }
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    const result = await response.json();

    // Cache GET responses for students endpoint (in-memory and localStorage)
    if (method === 'GET') {
      try {
        const paramsStr = url.split('?')[1] || '';
        const key = studentsCacheKey(paramsStr);
        cacheStore.set(key, result);
        try {
          localStorage.setItem(`students_cache:${paramsStr}`, JSON.stringify(result));
        } catch (e) {
          // ignore localStorage write errors
        }
      } catch (e) {
        // ignore cache errors
      }
    }

    // Mark timestamp on successful POST to suppress immediate following GETs
    // and invalidate any cached students results so subsequent GETs fetch fresh data.
    if (method === 'POST') {
      try {
        console.debug('manageStudents: POST completed, invalidating students cache and setting last_students_post_ts');
        localStorage.setItem('last_students_post_ts', Date.now().toString());
      } catch (e) {}
      try {
        // Clear in-memory cache entries for students
        for (const k of Array.from(cacheStore.keys())) {
          if (k.startsWith('students:')) cacheStore.delete(k);
        }
        // Clear localStorage student caches (best-effort)
        try {
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith('students_cache:')) localStorage.removeItem(key);
          }
        } catch (e) {}
      } catch (e) {
        // ignore cache clear errors
      }
    }

    return result;
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

// Timetable bootstrap (profile + branches + semesters + sections + subjects + faculties)
export const getHODTimetableBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: { branch_id: string; branch: string };
    semesters: Array<{ id: string; number: number }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/timetable-bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response) as any;
  }
};
export const manageBatches = async (
  data?: ManageBatchesRequest,
  batch_id?: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<ManageBatchesResponse> => {
  try {
    const url = batch_id
      ? `${API_ENDPOINT}/hod/batches/${batch_id}/`
      : `${API_ENDPOINT}/hod/batches/`;
    if (method === "POST" || method === "PUT") {
      if (!data?.start_year || !data?.end_year) {
        throw new Error("Start year and end year are required for POST/PUT requests");
      }
    }
    if (method === "DELETE" && !batch_id) {
      throw new Error("Batch ID is required for DELETE request");
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,

    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Batches Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getStudentPerformance = async (
  data: { branch_id: string; semester_id?: string; section_id?: string }
): Promise<{ success: boolean; data?: StudentPerformance[]; message?: string }> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    const params = new URLSearchParams({ branch_id: data.branch_id });
    if (data.semester_id) params.append("semester_id", data.semester_id);
    if (data.section_id) params.append("section_id", data.section_id);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/performance/?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageFaculties = async (
  params: { branch_id?: string; search?: string; page?: number; page_size?: number },
  method: "GET" = "GET"
): Promise<any> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.branch_id) queryParams.append("branch_id", params.branch_id);
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());

    const url = `${API_ENDPOINT}/hod/faculties/?${queryParams.toString()}`;
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const listFacultyBranches = async (): Promise<GetBranchesResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/faculty-branches/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getProctors = async (branch_id: string): Promise<GetFacultiesResponse> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctors/list/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageFacultyAssignments = async (
  data: ManageFacultyAssignmentsRequest,
  method: "GET" | "POST" = "GET"
): Promise<ManageFacultyAssignmentsResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    if (method === "POST" && !data.action) {
      throw new Error("Action is required for POST requests");
    }
    if (data.action === "create" && (!data.faculty_id || !data.subject_id || !data.semester_id || !data.section_id)) {
      throw new Error("Faculty ID, Subject ID, Semester ID, and Section ID are required for create action");
    }
    if (data.action === "update" && (!data.assignment_id || !data.faculty_id || !data.subject_id || !data.semester_id || !data.section_id)) {
      throw new Error("Assignment ID, Faculty ID, Subject ID, Semester ID, and Section ID are required for update action");
    }
    if (data.action === "delete" && !data.assignment_id) {
      throw new Error("Assignment ID is required for delete action");
    }
    let url = `${API_ENDPOINT}/hod/faculty-assignments/?branch_id=${data.branch_id}`;
    if (method === "GET") {
      const params = new URLSearchParams({ branch_id: data.branch_id });
      if (data.semester_id) params.append("semester_id", data.semester_id);
      if (data.section_id) params.append("section_id", data.section_id);
      if ((data as any).page) params.append("page", (data as any).page.toString());
      if ((data as any).search) params.append("search", (data as any).search);
      url = `${API_ENDPOINT}/hod/faculty-assignments/?${params.toString()}`;
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageTimetable = async (data: ManageTimetableRequest): Promise<ManageTimetableResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    if (data.action === "GET") {
      const params = new URLSearchParams({ branch_id: data.branch_id });
      if (data.semester_id) params.append("semester_id", data.semester_id);
      if (data.section_id) params.append("section_id", data.section_id);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/timetable/?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },

      });
      return await response.json();
    }

    if ((data.action === "create" || data.action === "update") && (!data.semester_id || !data.section_id)) {
      throw new Error("Semester ID and Section ID are required for create/update action");
    }

    const headers: HeadersInit = {};
    let body: FormData | string;

    if (data.action === "bulk_create") {
      if (!data.semester_id || !data.section_id || !data.file) {
        throw new Error("Semester ID, Section ID, and File are required for bulk_create action");
      }
      const formData = new FormData();
      formData.append("action", data.action);
      formData.append("branch_id", data.branch_id);
      formData.append("semester_id", data.semester_id);
      formData.append("section_id", data.section_id);
      if (data.room) formData.append("room", data.room);
      formData.append("file", data.file);
      body = formData;
    } else {
      if (data.action === "create" || data.action === "update") {
        if (!data.assignment_id || !data.day || !data.start_time || !data.end_time) {
          throw new Error("Assignment ID, Day, Start Time, and End Time are required for create/update action");
        }
      }
      if (data.action === "delete" && !data.timetable_id) {
        throw new Error("Timetable ID is required for delete action");
      }
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/timetable/`, {
      method: "POST",
      headers,
      body,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageHODLeaves = async (
  data: ManageHODLeavesRequest,
  method: "GET" | "POST" = "GET"
): Promise<ManageHODLeavesResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    const url = `${API_ENDPOINT}/hod/leave-applications/?branch_id=${data.branch_id}`;
    if (method === "POST" && (!data.title || !data.start_date || !data.end_date || !data.reason)) {
      throw new Error("Title, Start Date, End Date, and Reason are required for POST request");
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageLeaves = async (
  data: ManageLeavesRequest,
  method: "GET" | "PATCH" = "GET"
): Promise<ManageLeavesResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    const url = `${API_ENDPOINT}/hod/leaves/?branch_id=${data.branch_id}`;
    if (method === "PATCH" && (!data.action || !data.leave_id || !data.status)) {
      throw new Error("Action, Leave ID, and Status are required for PATCH request");
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PATCH" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getAttendance = async (params: GetAttendanceParams): Promise<GetAttendanceResponse> => {
  try {
    if (!params.branch_id) throw new Error("Branch ID is required");
    const query = new URLSearchParams(params as any).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/attendance/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getMarks = async (params: GetMarksParams): Promise<GetMarksResponse> => {
  try {
    if (!params.branch_id) throw new Error("Branch ID is required");
    const query = new URLSearchParams(params as any).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/marks/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const createAnnouncement = async (data: CreateAnnouncementRequest): Promise<CreateAnnouncementResponse> => {
  try {
    if (!data.branch_id || !data.title || !data.content || !data.target) {
      throw new Error("Branch ID, Title, Content, and Target are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/announcements/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const sendNotification = async (data: SendNotificationRequest): Promise<SendNotificationResponse> => {
  try {
    if (!data.branch_id || !data.title || !data.message) throw new Error("Branch ID, Title, and Message are required");
    if (data.action === "notify" && !data.student_id) throw new Error("Student ID is required for notify action");
    if (data.action === "notify_all" && !data.target) throw new Error("Target is required for notify_all action");
    if (data.action === "notify_low_attendance" && (!data.semester_id || !data.section_id || !data.subject_id || !data.threshold)) {
      throw new Error("Semester ID, Section ID, Subject ID, and Threshold are required for notify_low_attendance action");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/notifications/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getNotifications = async (branch_id: string): Promise<GetNotificationsResponse> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/notifications/history/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getSentNotifications = async (branch_id: string): Promise<GetNotificationsResponse> => {
  try {
    if (!branch_id) throw new Error("Branch ID is required");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/notifications/sent/?branch_id=${branch_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const assignProctor = async (data: AssignProctorRequest): Promise<AssignProctorResponse> => {
  try {
    if (!data.branch_id || !data.student_id || !data.faculty_id) {
      throw new Error("Branch ID, Student ID, and Faculty ID are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctors/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const assignProctorsBulk = async (data: AssignProctorsBulkRequest): Promise<AssignProctorsBulkResponse> => {
  try {
    const hasUsns = Array.isArray((data as any).usns) && (data as any).usns.length > 0;
    const hasStudentIds = Array.isArray((data as any).student_ids) && (data as any).student_ids.length > 0;
    if (!data.branch_id || !(hasUsns || hasStudentIds) || !data.faculty_id) {
      throw new Error("Branch ID, student IDs or USNs, and Faculty ID are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctors/bulk/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageChat = async (
  data: ManageChatRequest,
  method: "GET" | "POST" = "GET"
): Promise<ManageChatResponse> => {
  try {
    if (!data.branch_id) throw new Error("Branch ID is required");
    const url = `${API_ENDPOINT}/hod/chat/?branch_id=${data.branch_id}`;
    if (method === "POST") {
      if (!data.action) throw new Error("Action is required for POST requests");
      if (data.action === "create_channel" && (!data.name || !data.channel_type)) {
        throw new Error("Name and Channel Type are required for create_channel action");
      }
      if (data.action === "send_message" && (!data.channel_id || !data.content)) {
        throw new Error("Channel ID and Content are required for send_message action");
      }
    }
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(data) : undefined,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const manageProfile = async (
  data: ManageProfileRequest,
  method: "GET" | "PATCH" = "GET"
): Promise<ManageProfileResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/profile/`, {
      method,
      headers: { "Content-Type": "application/json" },
      // prevent conditional requests that result in 304 when we want fresh profile
      cache: method === 'GET' ? 'no-store' : undefined,
      body: method === "PATCH" ? JSON.stringify(data) : undefined,
    });

    // If server returned 304 Not Modified, try to use cached profile from localStorage
    if (response.status === 304) {
      try {
        const cached = localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          return { success: true, data: parsed } as ManageProfileResponse;
        }
        return { success: false, message: 'Profile not modified and no cached profile available' } as ManageProfileResponse;
      } catch (e) {
        return { success: false, message: 'Profile not modified and failed to read cache' } as ManageProfileResponse;
      }
    }

    // For other responses, attempt to parse JSON and return
    if (!response.ok) {
      let parsed: any = null;
      try { parsed = await response.json(); } catch (e) { /* ignore */ }
      const message = parsed?.message || `Request failed (status: ${response.status})`;
      return { success: false, message, data: parsed?.data } as ManageProfileResponse;
    }

    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const uploadStudyMaterial = async (data: UploadStudyMaterialRequest): Promise<UploadStudyMaterialResponse> => {
  try {
    if (!data.branch_id || !data.semester_id || !data.title || !data.file) {
      throw new Error("Branch ID, Semester ID, Title, and File are required");
    }
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("subject_name", data.subject_name || "");
    formData.append("subject_code", data.subject_code || "");
    formData.append("semester_id", data.semester_id);
    formData.append("branch_id", data.branch_id);
    if (data.section_id) formData.append("section_id", data.section_id);
    formData.append("file", data.file);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/study-materials/`, {
      method: "POST",
      body: formData,

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getStudyMaterials = async (
  branch_id?: string,
  semester_id?: string,
  section_id?: string,
  search?: string
): Promise<GetStudyMaterialsResponse> => {
  try {
    const params = new URLSearchParams();
    if (branch_id) params.append('branch_id', branch_id);
    if (semester_id) params.append('semester_id', semester_id);
    if (section_id) params.append('section_id', section_id);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/study-materials/${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const promoteStudentsToNextSemester = async (data: PromoteStudentsRequest): Promise<PromoteStudentsResponse> => {
  try {
    if (!data.branch_id || !data.from_semester_id || !data.to_semester_id) {
      throw new Error("Branch ID, From Semester ID, and To Semester ID are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/promote-students/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const promoteSelectedStudents = async (data: PromoteSelectedStudentsRequest): Promise<PromoteSelectedStudentsResponse> => {
  try {
    if (!data.branch_id || !data.student_ids?.length || !data.to_semester_id) {
      throw new Error("Branch ID, non-empty Student IDs, and To Semester ID are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/promote-selected-students/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const demoteStudent = async (data: DemoteStudentRequest): Promise<DemoteStudentResponse> => {
  try {
    if (!data.branch_id || !data.student_id || !data.to_semester_id || !data.reason) {
      throw new Error("Branch ID, Student ID, To Semester ID, and Reason are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/demote-student/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const bulkDemoteStudents = async (data: BulkDemoteStudentsRequest): Promise<BulkDemoteStudentsResponse> => {
  try {
    if (!data.branch_id || !data.student_ids?.length || !data.to_semester_id || !data.reason) {
      throw new Error("Branch ID, non-empty Student IDs, To Semester ID, and Reason are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/demote-students/bulk/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getPromotionEligibility = async (params: GetPromotionEligibilityParams): Promise<GetPromotionEligibilityResponse> => {
  try {
    if (!params.branch_id || !params.semester_id) {
      throw new Error("Branch ID and Semester ID are required");
    }
    const query = new URLSearchParams(params as any).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/promotion-eligibility/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getExamFailures = async (params: GetExamFailuresParams): Promise<GetExamFailuresResponse> => {
  try {
    if (!params.branch_id) throw new Error("Branch ID is required");
    const query = new URLSearchParams(params as any).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/exam-failures/?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const recordExamFailure = async (data: RecordExamFailureRequest): Promise<RecordExamFailureResponse> => {
  try {
    if (!data.branch_id || !data.student_id || !data.subject_id || !data.semester_id || !data.failure_date) {
      throw new Error("Branch ID, Student ID, Subject ID, Semester ID, and Failure Date are required");
    }
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/record-exam-failure/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),

    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

// New combined bootstrap endpoints
export const getFacultyAssignmentsBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      branch: string;
      branch_id: string;
    };
    semesters: Array<{ id: string; number: number }>;
    faculties: Array<{ id: string; username: string; first_name: string; last_name: string }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/faculty-assignments-bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getNotificationsBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      branch: string;
      branch_id: string;
    };
    received_notifications: Array<{
      id: string;
      title: string;
      message: string;
      notification_type: string;
      priority: string;
      created_at: string;
      read: boolean;
    }>;
    sent_notifications: Array<{
      id: string;
      title: string;
      message: string;
      notification_type: string;
      priority: string;
      created_at: string;
      recipient_count: number;
    }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/notifications-bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

export const getPromotionBootstrap = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      branch: string;
      branch_id: string;
    };
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string | null }>;
  };
}> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/promotion-bootstrap/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error: unknown) {
    return handleApiError(error, (error as any).response);
  }
};

// Faculty Attendance API functions for HOD
export interface FacultyAttendanceTodayRecord {
  id: string;
  faculty_name: string;
  faculty_id: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
}
export interface AttendanceLocation {
  latitude?: number | null;
  longitude?: number | null;
  inside?: boolean | null;
  distance_meters?: number | null;
  campus_name?: string | null;
}

export interface GetFacultyAttendanceTodayResponse {
  success: boolean;
  message?: string;
  data?: FacultyAttendanceTodayRecord[];
  summary?: {
    total_faculty: number;
    present: number;
    absent: number;
    not_marked: number;
  };
  pagination?: {
    page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
    next_page: number | null;
    prev_page: number | null;
  };
}

export interface FacultyAttendanceRecord {
  id: string;
  faculty_name: string;
  faculty_id: string;
  date: string;
  status: string;
  marked_at: string;
  notes: string;
  location?: AttendanceLocation | null;
}

export interface GetFacultyAttendanceRecordsResponse {
  success: boolean;
  message?: string;
  data?: FacultyAttendanceRecord[];
  faculty_summary?: Array<{
    name: string;
    total_days: number;
    present_days: number;
    absent_days: number;
    attendance_percentage: number;
  }>;
  pagination?: {
    page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
    next_page: number | null;
    prev_page: number | null;
  };
}

export const getFacultyAttendanceToday = async (params?: {
  page?: number;
  page_size?: number;
}): Promise<GetFacultyAttendanceTodayResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const url = `${API_ENDPOINT}/hod/faculty-attendance-today/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Faculty Attendance Today Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFacultyAttendanceRecords = async (params?: {
  start_date?: string;
  end_date?: string;
  faculty_id?: string;
  page?: number;
  page_size?: number;
}): Promise<GetFacultyAttendanceRecordsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.faculty_id) queryParams.append("faculty_id", params.faculty_id);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const url = `${API_ENDPOINT}/hod/faculty-attendance-records/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Faculty Attendance Records Error:", error);
    return { success: false, message: "Network error" };
  }
};