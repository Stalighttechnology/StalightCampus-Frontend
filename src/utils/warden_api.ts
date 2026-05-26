import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface WardenStats {
  total_managed_hostels: number;
  total_rooms: number;
  total_students: number;
  total_issues: number;
  pending_issues: number;
  occupancy_rate: number;
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
  page: number = 1
) => {
  let url = `${API_ENDPOINT}/warden/students/`;
  const params = new URLSearchParams();
  if (hostelId) params.append('hostel_id', hostelId.toString());
  if (floor && floor !== 'all') params.append('floor', floor);
  if (batch) params.append('batch', batch);
  if (branch) params.append('branch', branch);
  if (semester) params.append('semester', semester);
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

export const getWardenIssues = async () => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/issues/`);
  if (!response.ok) {
    throw new Error("Failed to fetch warden issues");
  }
  return response.json();
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
  visitor_name: string;
  contact_details: string;
  purpose: string;
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

