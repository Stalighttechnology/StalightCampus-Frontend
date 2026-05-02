import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface AssignedSubject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  sections: Array<{ section: string; section_id: string; semester: number; semester_id: string; branch: string; branch_id: string }>;
}

export const getAssignedSubjectsGrouped = async (): Promise<{ success: boolean; data?: any; grouped?: AssignedSubject[]; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assigned-subjects/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  file: File;
}

export const uploadStudyMaterial = async (data: UploadStudyMaterialRequest) => {
  try {
    if (!data.branch_id || !data.semester_id || !data.title || !data.file) {
      throw new Error("Branch ID, Semester ID, Title, and File are required");
    }
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.subject_id) formData.append('subject_id', data.subject_id);
    formData.append('subject_name', data.subject_name || '');
    formData.append('subject_code', data.subject_code || '');
    formData.append('semester_id', data.semester_id);
    formData.append('branch_id', data.branch_id);
    if (data.section_id) formData.append('section_id', data.section_id);
    formData.append('file', data.file);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/study-materials/`, {
      method: 'POST',
      body: formData,
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getStudyMaterials = async (branch_id?: string, semester_id?: string, section_id?: string, search?: string) => {
  try {
    const params = new URLSearchParams();
    if (branch_id) params.append('branch_id', branch_id);
    if (semester_id) params.append('semester_id', semester_id);
    if (section_id) params.append('section_id', section_id);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/study-materials/${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getBranches = async (): Promise<{ success: boolean; data?: { id: string; name: string }[]; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/branches/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getSemesters = async (branch_id: string): Promise<{ success: boolean; data?: { id: string; number: number }[]; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/semesters/?branch_id=${branch_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (error: unknown) {
    return { success: false, message: (error as any).toString() };
  }
};

export const getSections = async (branch_id: string, semester_id: string): Promise<{ success: boolean; data?: { id: string; name: string }[]; message?: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/sections/?branch_id=${branch_id}&semester_id=${semester_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  method: "manual" | "ai";
  date?: string; // YYYY-MM-DD
  class_images?: File[];
  attendance?: Array<{ student_id: string; status: boolean }>;
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
  marks?: Array<{ student_id: string; mark: number }>;
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
}

interface ApplyLeaveResponse {
  success: boolean;
  message?: string;
  data?: Array<{ id: string; branch: string }>;
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

interface GetApplyLeaveBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    assignments: FacultyAssignment[];
    leave_requests: FacultyLeaveRequest[];
    branches: { id: number; name: string }[];
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
    stats: Array<{ student__name: string; percentage: number }>;
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
  reason: string;
  status: string;
  applied_on: string;
  reviewed_by?: string | null;
}



// Faculty-specific API functions
export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/dashboard/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Dashboard Overview Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const takeAttendance = async (
  data: TakeAttendanceRequest
): Promise<TakeAttendanceResponse> => {
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error("Take Attendance Error:", error);
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
    attendance_record_id: number;
    total_students: number;
    present_count: number;
    absent_count: number;
    present_students: Array<{
      id: number;
      name: string;
      usn: string;
    }>;
    absent_students: Array<{
      id: number;
      name: string;
      usn: string;
    }>;
  };
}

export const aiAttendance = async (
  data: AIAttendanceRequest
): Promise<AIAttendanceResponse> => {
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error("AI Attendance Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const uploadInternalMarks = async (
  data: UploadMarksRequest
): Promise<UploadMarksResponse> => {
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error("Upload Internal Marks Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const applyLeave = async (
  data: ApplyLeaveRequest
): Promise<ApplyLeaveResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/apply-leave/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Apply Leave Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const viewAttendanceRecords = async (
  params: { branch_id: string; semester_id: string; section_id: string; subject_id: string }
): Promise<ViewAttendanceRecordsResponse> => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("View Attendance Records Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const createAnnouncement = async (
  data: CreateAnnouncementRequest
): Promise<CreateAnnouncementResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/announcements/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Create Announcement Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getProctorStudents = async (params?: {
  page?: number;
  page_size?: number;
  include?: string | string[]; // e.g. 'students' or ['students']
  exam_period?: string;
  only_with_leaves?: boolean;
}): Promise<GetProctorStudentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.include) {
      const includes = Array.isArray(params.include) ? params.include : params.include.split(',');
      const normalizedIncludes = includes.map(s => s.trim()).filter(Boolean);

      // Special-case 'minimal' keyword: backend expects 'minimal=true' flag
      if (normalizedIncludes.includes('minimal')) {
        queryParams.append('minimal', 'true');
      }

      const nonMinimal = normalizedIncludes.filter(s => s !== 'minimal');
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

    const basePath = params && params.exam_period
      ? `${API_ENDPOINT}/faculty/proctor-students/with-exam-status/`
      : `${API_ENDPOINT}/faculty/proctor-students/`;

    const url = queryParams.toString()
      ? `${basePath}?${queryParams.toString()}`
      : basePath;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Proctor Students Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Lightweight proctor students fetch for statistics page - requests minimal fields from backend
export const getProctorStudentsForStats = async (params?: {
  page?: number;
  page_size?: number;
}): Promise<GetProctorStudentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
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
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
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
    console.error("Get Proctor Students (minimal) Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getFacultyAssignments = async (): Promise<GetFacultyAssignmentsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assignments/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Faculty Assignments Error:", error);
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
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Get Faculty Dashboard Bootstrap Error:", error);
      return { success: false, message: "Network error" };
    }
  })();

  facultyDashboardTimestamp = now;
  return facultyDashboardPromise;
};

export const getAttendanceRecordsWithSummary = async (params?: {
  page?: number;
  page_size?: number;
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

    const url = queryParams.toString()
      ? `${API_ENDPOINT}/faculty/attendance-records/summary/?${queryParams.toString()}`
      : `${API_ENDPOINT}/faculty/attendance-records/summary/`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Attendance Records With Summary Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getApplyLeaveBootstrap = async (): Promise<GetApplyLeaveBootstrapResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/apply-leave/bootstrap/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Apply Leave Bootstrap Error:", error);
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
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        return await response.json();
      } finally {
        inflightRequests.delete(url);
      }
    })();

    inflightRequests.set(url, promise);
    return promise;
  } catch (error) {
    console.error("Get Timetable Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageChat = async (
  data: SendChatMessageRequest,
  method: "GET" | "POST" = "GET"
): Promise<ManageChatResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/chat/`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(data) : undefined,
    });
    return await response.json();
  } catch (error) {
    console.error("Manage Chat Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageProfile = async (
  data: ManageProfileRequest
): Promise<ManageProfileResponse> => {
  try {
    const formData = new FormData();
    if (data.first_name) formData.append("first_name", data.first_name);
    if (data.last_name) formData.append("last_name", data.last_name);
    if (data.email) formData.append("email", data.email);
    if (data.mobile) formData.append("mobile", data.mobile);
    if (data.address) formData.append("address", data.address);
    if (data.bio) formData.append("bio", data.bio);
    if (data.profile_picture) formData.append("profile_picture", data.profile_picture);
    // Faculty-specific fields
    if (data.date_of_birth) formData.append("date_of_birth", data.date_of_birth);
    if (data.gender) formData.append("gender", data.gender);
    if (data.department) formData.append("department", data.department);
    if (data.designation) formData.append("designation", data.designation);
    if (data.qualification) formData.append("qualification", data.qualification);
    // prefer explicit branch_id when available
    if (typeof data.branch_id !== 'undefined' && data.branch_id !== null) formData.append("branch_id", String(data.branch_id));
    else if (typeof data.branch !== 'undefined' && data.branch !== null) formData.append("branch", String(data.branch));
    if (typeof data.experience_years !== 'undefined' && data.experience_years !== null) formData.append("experience_years", String(data.experience_years));
    if (data.office_location) formData.append("office_location", data.office_location);
    if (data.office_hours) formData.append("office_hours", data.office_hours);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/profile/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error("Manage Profile Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const scheduleMentoring = async (
  data: ScheduleMentoringRequest
): Promise<ScheduleMentoringResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/schedule-mentoring/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Schedule Mentoring Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const generateStatistics = async (
  params: { file_id: string }
): Promise<GenerateStatisticsResponse> => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/generate-statistics/?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Generate Statistics Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const downloadPDF = async (
  filename: string
): Promise<DownloadPDFResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/download-pdf/${filename}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      return { success: true, file_url: url };
    }
    return await response.json();
  } catch (error) {
    console.error("Download PDF Error:", error);
    return { success: false, message: "Network error" };
  }
};

export async function getStudentsForClass(
  branch_id: number,
  semester_id: number,
  section_id: number,
  subject_id: number
): Promise<ClassStudent[]> {
  const params = new URLSearchParams({
    branch_id: branch_id.toString(),
    semester_id: semester_id.toString(),
    section_id: section_id.toString(),
    subject_id: subject_id.toString(),
  });
  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/students/?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
    credentials: 'include',
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
  test_number: number
): Promise<InternalMarkStudent[]> => {
  const params = new URLSearchParams({
    branch_id: branch_id.toString(),
    semester_id: semester_id.toString(),
    section_id: section_id.toString(),
    subject_id: subject_id.toString(),
    test_number: test_number.toString(),
  });
  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/internal-marks/?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch internal marks');
  return data.data;
};

export const getFacultyLeaveRequests = async (): Promise<FacultyLeaveRequest[]> => {
  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/leave-requests/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch leave requests');
  return data.data;
};

export const getFacultyProfile = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Faculty Profile Error:", error);
    return { success: false, message: "Network error" };
  }
};

export async function getFacultyNotifications() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/notifications/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  });
  return await response.json();
}

export async function getFacultySentNotifications() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/notifications/sent/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  });
  return await response.json();
}



export async function getAttendanceRecordsList() {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/list/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  });
  return await response.json();
}

export async function getAttendanceRecordDetails(recordId: number) {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/attendance-records/${recordId}/details/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Take Attendance Bootstrap Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getAssignedSubjects = async (): Promise<{ success: boolean; message?: string; data?: FacultyAssignment[] }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/assigned-subjects/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Get Assigned Subjects Error:', error);
    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForRegular = async (params: { branch_id: string; semester_id: string; section_id: string; subject_id: string; page?: number; page_size?: number; }) => {
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
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Get Students For Regular Error:', error);
    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForElective = async (params: { subject_id: string; branch_id: string; semester_id: string; section_id?: string; page?: number; page_size?: number; }) => {
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
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Get Students For Elective Error:', error);
    return { success: false, message: 'Network error' };
  }
};

export const getStudentsForOpenElective = async (params: { subject_id: string; branch_id?: string; semester_id?: string; section_id?: string; page?: number; page_size?: number; }) => {
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
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Get Students For Open Elective Error:', error);
    return { success: false, message: 'Network error' };
  }
};

export const getSubjectDetail = async (subject_id: string): Promise<{ success: boolean; message?: string; data?: { id: number; name: string; subject_type: string; subject_code?: string; semester_id?: number | null; branch_id?: number | null } }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/common/subject-detail/?subject_id=${encodeURIComponent(subject_id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Get Subject Detail Error:', error);
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
      page_size: params.page_size,
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Upload Marks Bootstrap Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface ManageStudentLeaveRequest {
  leave_id: string;
  action: "APPROVE" | "REJECT";
}

interface ManageStudentLeaveResponse {
  success: boolean;
  message?: string;
}

export const manageStudentLeave = async (
  data: ManageStudentLeaveRequest
): Promise<ManageStudentLeaveResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/manage-student-leave/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Manage Student Leave Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Faculty Attendance API functions
export interface MarkFacultyAttendanceRequest {
  status: "present" | "absent";
  notes?: string;
}

export interface MarkFacultyAttendanceResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    date: string;
    status: string;
    marked_at: string;
    updated?: boolean;
    // location validation removed
  };
}

export interface FacultyAttendanceRecord {
  id: string;
  date: string;
  status: string;
  marked_at: string;
  notes: string;
  location?: AttendanceLocation | null;
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
  data: MarkFacultyAttendanceRequest
): Promise<MarkFacultyAttendanceResponse> => {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    };
    const bodyPayload = JSON.stringify(data);
    if (bodyPayload) headers['Content-Type'] = 'application/json';

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/mark-attendance/`, {
      method: "POST",
      headers,
      body: bodyPayload,
    });
    return await response.json();
  } catch (error) {
    console.error("Mark Faculty Attendance Error:", error);
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

    const url = `/api/faculty/my-attendance-records/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Create QP Error:", error);
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get QPs Error:", error);
    return { success: false };
  }
};

export const getQuestionPaperDetail = async (id: number): Promise<any> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/qps/?qp_id=${id}&detail=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get QP Detail Error:", error);
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
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get Students for Marks Error:", error);
    return { success: false };
  }
};

export const uploadIAMarks = async (data: UploadIAMarksRequest): Promise<any> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/upload-ia-marks/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Upload IA Marks Error:", error);
    return { success: false };
  }
};

export const updateQuestionPaper = async (id: number, data: CreateQPRequest): Promise<QPResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/faculty/qps/${id}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Update QP Error:", error);
    return { success: false };
  }
};

export const submitQPForApproval = async (qpId: number, comment?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/qps/${qpId}/submit/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ comment: comment || "" }),
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.message || (response.ok ? "QP submitted for approval" : "Failed to submit QP"),
    };
  } catch (error) {
    console.error("Submit QP Error:", error);
    return {
      success: false,
      message: "Network error while submitting QP",
    };
  }
};

export const getCOAttainment = async (params: { 
  subject_id?: number; 
  question_paper_id?: number; 
  target_pct?: number; 
  indirect_attainment?: string 
}) => {
  try {
    const query = new URLSearchParams();
    if (params.subject_id) query.append('subject_id', params.subject_id.toString());
    if (params.question_paper_id) query.append('question_paper', params.question_paper_id.toString());
    if (params.target_pct) query.append('target_pct', params.target_pct.toString());
    if (params.indirect_attainment) query.append('indirect_attainment', params.indirect_attainment);

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/co-attainment/?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Get CO Attainment Error:", error);
    return { success: false, message: "Network error while fetching CO attainment" };
  }
};