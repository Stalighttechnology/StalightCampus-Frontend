import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface WardenStats {
  total_managed_hostels: number;
  total_rooms: number;
  total_students: number;
  total_issues: number;
  pending_issues: number;
  occupancy_rate: number;
  total_capacity?: number;
}

export interface WardenDashboardData {
  success: boolean;
  warden_name: string;
  statistics: WardenStats;
  data: {
    hostels: any[];
  };
}

export const getWardenDashboard = async (): Promise<WardenDashboardData> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/dashboard/`);
  if (!response.ok) {
    throw new Error("Failed to fetch warden dashboard data");
  }
  return response.json();
};

export const getWardenStudents = async (
  hostelId?: number, 
  floor?: string,
  batch?: string,
  branch?: string,
  semester?: string,
  page: number = 1,
  search?: string
) => {
  let url = `${API_ENDPOINT}/warden/students/`;
  const params = new URLSearchParams();
  if (hostelId) params.append('hostel_id', hostelId.toString());
  if (floor && floor !== 'all') params.append('floor', floor);
  if (batch) params.append('batch', batch);
  if (branch) params.append('branch', branch);
  if (semester) params.append('semester', semester);
  if (search) params.append('search', search);
  params.append('page', page.toString());
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetchWithTokenRefresh(url);
  if (!response.ok) {
    throw new Error("Failed to fetch warden students");
  }
  return response.json();
};

export const getWardenStudentDetail = async (studentId: number) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/students/${studentId}/`);
  if (!response.ok) {
    throw new Error("Failed to fetch warden student details");
  }
  return response.json();
};

export const getWardenRooms = async (hostelId?: number, floor?: string) => {
  let url = `${API_ENDPOINT}/warden/rooms/`;
  const params = new URLSearchParams();
  if (hostelId) params.append('hostel_id', hostelId.toString());
  if (floor && floor !== 'all') params.append('floor', floor);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetchWithTokenRefresh(url);
  if (!response.ok) {
    throw new Error("Failed to fetch warden rooms");
  }
  return response.json();
};

export const getWardenIssues = async (status?: string, page: number = 1) => {
  let url = `${API_ENDPOINT}/warden/issues/?page=${page}`;
  if (status && status !== 'all') {
    url += `&status=${status}`;
  }
  const response = await fetchWithTokenRefresh(url);
  if (!response.ok) {
    throw new Error("Failed to fetch warden issues");
  }
  return response.json();
};

export const exportWardenIssuesPdf = async (status?: string): Promise<Blob> => {
  let url = `${API_ENDPOINT}/warden/issues/export_pdf/`;
  if (status && status !== 'all') {
    url += `?status=${status}`;
  }
  const response = await fetchWithTokenRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to export PDF");
  }
  return response.blob();
};

export const exportWardenSingleIssuePdf = async (issueId: number): Promise<Blob> => {
  const url = `${API_ENDPOINT}/hms/issues/${issueId}/export_issue_pdf/`;
  const response = await fetchWithTokenRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to export single issue PDF");
  }
  return response.blob();
};

export const updateWardenIssue = async (issueId: number, data: { status: string; remarks?: string }) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/issues/${issueId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update issue");
  }
  return response.json();
};

export const getWardenVisitorLogs = async (page = 1, search = '') => {
  let url = `${API_ENDPOINT}/warden/visitor-logs/?page=${page}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await fetchWithTokenRefresh(url);
  if (!response.ok) {
    throw new Error("Failed to fetch visitor logs");
  }
  return response.json();
};

export const createWardenVisitorLog = async (data: {
  student: number;
  hostel: number;
  visitor_name: string;
  mobile_number: string;
  purpose: string;
  check_in_time?: string;
  check_out_time?: string | null;
}) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/visitor-logs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create visitor log");
  }
  return response.json();
};

export const checkoutWardenVisitorLog = async (logId: number) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/visitor-logs/${logId}/checkout/`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to check out visitor");
  }
  return response.json();
};

export const exportWardenVisitorLogsPdf = async (search = ''): Promise<Blob> => {
  let url = `${API_ENDPOINT}/warden/visitor-logs/export_pdf/`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }
  const response = await fetchWithTokenRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to export PDF");
  }
  return response.blob();
};

export const sendWardenVisitorReminder = async (logId: number) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/visitor-logs/${logId}/send_reminder/`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to send visitor reminder");
  }
  return response.json();
};


