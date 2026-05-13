import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Type definitions for request and response data
interface NextLecture {
  subject: string;
  start_time: string;
  teacher: string;
  room: string;
}

interface AttendanceWarning {
  subject: string;
  percentage: number;
}

interface CurrentSession {
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
}

interface NextSession {
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  starts_at: string;
}

interface SubjectPerformance {
  subject: string;
  attendance_percentage: number;
  average_mark: number;
}

interface LeaveRequestStatus {
  period: string;
  reason: string;
  status: string;
}

interface NotificationItem {
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface DashboardOverviewData {
  today_lectures: {
    count: number;
    next_lecture: NextLecture | null;
  };
  attendance_status: {
    percentage: number;
    warnings: AttendanceWarning[];
  };
  current_next_session: {
    live_time: string;
    current_session: CurrentSession | null;
    next_session: NextSession | null;
  };
  performance_overview: {
    correlation: number;
    subject_performance: SubjectPerformance[];
  };
  unread_announcement_count?: number;
}

interface DashboardOverviewResponse {
  success: boolean;
  message?: string;
  data?: DashboardOverviewData;
}

// Export the interface so it can be imported in components
export type { DashboardOverviewResponse, TimetableEntry };

interface TimetableEntry {
  id: string;
  faculty: {id: string;first_name: string;last_name: string;};
  subject: {id: string;name: string;};
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface GetTimetableResponse {
  success: boolean;
  message?: string;
  data?: TimetableEntry[];
}

interface AttendanceRecord {
  id: string;
  subject: {id: string;name: string;};
  date: string;
  status: string;
}

interface SubjectAttendance {
  records: {date: string;status: "Present" | "Absent";}[];
  present: number;
  total: number;
  percentage: number;
}

interface AttendanceData {
  [subject: string]: SubjectAttendance;
}

interface GetStudentAttendanceResponse {
  success: boolean;
  message?: string;
  data?: AttendanceData;
}

interface Mark {
  id: string;
  subject: {id: string;name: string;};
  test_number: number;
  mark: number;
  max_mark: number;
}

interface InternalMark {
  subject: string;
  subject_code: string;
  test_number: number;
  mark: number;
  max_mark: number;
  percentage: number;
  faculty: string;
  recorded_at: string;
}

interface IAMark {
  subject: string;
  subject_code: string;
  test_type: string;
  total_obtained: number;
  max_marks: number;
  percentage: number;
  faculty: string;
  recorded_at: string;
}

interface GetInternalMarksResponse {
  success: boolean;
  message?: string;
  data?: InternalMark[];
}

interface SubmitLeaveRequestRequest {
  start_date: string;
  end_date: string;
  title?: string;
  reason: string;
}

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at?: string;
}

interface SubmitLeaveRequestResponse {
  success: boolean;
  message?: string;
  leave_request?: LeaveRequest;
}

interface GetLeaveRequestsResponse {
  success: boolean;
  message?: string;
  data?: LeaveRequest[];
  count?: number;
  total_pages?: number;
  current_page?: number;
  next?: string | null;
  previous?: string | null;
}

// Export the interface so it can be imported in components
export type { GetLeaveRequestsResponse, GetStudentAttendanceResponse, GetInternalMarksResponse, SubmitLeaveRequestRequest, UpdateProfileRequest, UploadCertificateRequest, GetCertificatesResponse, DeleteCertificateRequest, GetNotificationsResponse };

interface UploadCertificateRequest {
  file: File;
  description: string;
}

interface Certificate {
  id: string;
  file_url: string;
  description: string;
  uploaded_at: string;
}

interface UploadCertificateResponse {
  success: boolean;
  message?: string;
  certificate?: Certificate;
}

interface GetCertificatesResponse {
  success: boolean;
  message?: string;
  certificates?: Certificate[];
}

interface DeleteCertificateRequest {
  certificate_id: string;
}

interface DeleteCertificateResponse {
  success: boolean;
  message?: string;
}

interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  address?: string;
  bio?: string;
}

interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    mobile_number: string;
    address: string;
    bio: string;
  };
}

interface Announcement {
  id?: number;
  title: string;
  content: string;
  created_at: string;
}

interface GetAnnouncementsResponse {
  success: boolean;
  message?: string;
  data?: Announcement[];
}

interface ChatMessage {
  id: string;
  channel: {id: string;name: string;};
  sender: {id: string;first_name: string;last_name: string;};
  content: string;
  sent_at: string;
}

interface ManageChatResponse {
  success: boolean;
  message?: string;
  messages?: ChatMessage[];
}

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

interface GetNotificationsResponse {
  success: boolean;
  message?: string;
  notifications?: Notification[];
}

interface UploadFaceEncodingsRequest {
  encodings: string;
}

interface UploadFaceEncodingsResponse {
  success: boolean;
  message?: string;
}

// Student-specific API functions
let dashboardOverviewPromise: Promise<DashboardOverviewResponse> | null = null;
let dashboardOverviewTimestamp = 0;

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  const now = Date.now();
  if (dashboardOverviewPromise && now - dashboardOverviewTimestamp < 5000) {
    return dashboardOverviewPromise;
  }

  dashboardOverviewPromise = (async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/dashboard/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : "Network error";
      return { success: false, message: errorMessage };
    }
  })();

  dashboardOverviewTimestamp = now;
  return dashboardOverviewPromise;
};

export const getTimetable = async (): Promise<GetTimetableResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/timetable/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getStudentAttendance = async (): Promise<GetStudentAttendanceResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/attendance/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {

    const errorMessage = error instanceof Error ? error.message : "Network error";
    return { success: false, message: errorMessage };
  }
};

export const getInternalMarks = async (): Promise<GetInternalMarksResponse> => {

  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/internal-marks/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const submitLeaveRequest = async (
data: SubmitLeaveRequestRequest)
: Promise<SubmitLeaveRequestResponse> => {
  try {
    // Debug log
    // Debug log
    // Debug log
    // Debug log

    const token = localStorage.getItem("access_token");
    if (!token) {

      return { success: false, message: "No authentication token found" };
    }

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/submit-leave-request/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    // Debug log
    // Debug log

    if (!response.ok) {
      // Debug log
      const errorText = await response.text();
      // Debug log
      return { success: false, message: `HTTP error! status: ${response.status}, body: ${errorText}` };
    }

    const contentType = response.headers.get("content-type");
    // Debug log

    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text();
      // Debug log
      return { success: false, message: "Invalid response format" };
    }

    const responseData = await response.json();
    // Debug log

    // Check if the response has the expected structure
    if (!responseData.hasOwnProperty('success')) {

      return { success: false, message: "Unexpected API response structure" };
    }

    // Debug log
    return responseData;
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getLeaveRequests = async (page = 1, pageSize = 20): Promise<GetLeaveRequestsResponse> => {
  try {
    // Debug log
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    const token = localStorage.getItem("access_token");
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/leave-requests/?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    // Debug log
    // Debug log

    if (!response.ok) {
      // Debug log
      const errorText = await response.text();
      // Debug log
      return { success: false, message: `HTTP error! status: ${response.status}, body: ${errorText}` };
    }

    const contentType = response.headers.get("content-type");
    // Debug log

    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text();
      // Debug log
      return { success: false, message: "Invalid response format" };
    }

    const responseData = await response.json();
    // Debug log

    // Check if the response has the expected structure
    if (!responseData.hasOwnProperty('success')) {

      return { success: false, message: "Unexpected API response structure" };
    }

    // Additional validation for leave requests
    if (responseData.success && responseData.leave_requests) {

      if (responseData.leave_requests.length > 0) {

      }
    }

    // Debug log
    return responseData;
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

// Helper function to add a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Enhanced version with retry mechanism
export const getLeaveRequestsWithRetry = async (maxRetries = 3): Promise<GetLeaveRequestsResponse> => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await getLeaveRequests();
    if (response.success && response.leave_requests && response.leave_requests.length > 0) {
      return response;
    }
    if (i < maxRetries - 1) {
      // Wait 1 second before retrying
      await delay(1000);
    }
  }
  return await getLeaveRequests(); // Return the last attempt
};

export const uploadCertificate = async (
data: UploadCertificateRequest)
: Promise<UploadCertificateResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("description", data.description);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/upload-certificate/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getCertificates = async (): Promise<GetCertificatesResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/certificates/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const deleteCertificate = async (
data: DeleteCertificateRequest)
: Promise<DeleteCertificateResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/delete-certificate/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const updateProfile = async (
data: UpdateProfileRequest)
: Promise<UpdateProfileResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/update-profile/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getAnnouncements = async (): Promise<GetAnnouncementsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/announcements/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const manageChat = async (
data: any,
method: "GET" | "POST" = "GET")
: Promise<ManageChatResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/chat/`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: method === "POST" ? JSON.stringify(data) : undefined
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getNotifications = async (): Promise<GetNotificationsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/notifications/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const uploadFaceEncodings = async (
data: UploadFaceEncodingsRequest)
: Promise<UploadFaceEncodingsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/upload-face-encodings/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getFullStudentProfile = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/full-profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getStudentAssignments = async (params?: {search?: string;page?: number;page_size?: number;}) => {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/assignments/${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const submitAssignment = async (assignmentId: number, file: File) => {
  try {
    const formData = new FormData();
    formData.append("submitted_file", file);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/assignments/${assignmentId}/submit/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getStudentStudyMaterials = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/study-materials/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getAllStudyMaterials = async (
branchId?: string,
semesterId?: string,
sectionId?: string,
search?: string,
page = 1,
pageSize = 50) =>
{
  try {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    if (semesterId) params.append('semester_id', semesterId);
    if (sectionId) params.append('section_id', sectionId);
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/all-study-materials/?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getBranches = async () => {

  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/branches/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getSemesters = async (branchId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/semesters/?branch_id=${branchId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};

export const getSections = async (branchId: string, semesterId: string) => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/sections/?branch_id=${branchId}&semester_id=${semesterId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {

    return { success: false, message: "Network error" };
  }
};