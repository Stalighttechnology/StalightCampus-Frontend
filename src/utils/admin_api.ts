import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Type definitions for request and response data
interface BranchDistribution {
  name: string;
  students: number;
  faculty: number;
}

interface RoleDistribution {
  students: number;
  faculty: number;
  hods: number;
  coe: number;
}

interface AdminStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    total_students: number;
    total_faculty: number;
    total_hods: number;
    total_coe: number;
    total_branches: number;
    branch_distribution: BranchDistribution[];
    role_distribution: RoleDistribution;
    unread_announcement_count?: number;
  };
}

interface EnrollUserRequest {
  username: string;
  email: string;
  role: "hod" | "teacher" | "coe" | "hms_admin";
  first_name: string;
  last_name?: string;
  phone?: string;
  designation?: string;
}

interface EnrollUserResponse {
  success: boolean;
  message?: string;
  user_id?: string;
}

interface BulkUploadFacultyResponse {
  success: boolean;
  message?: string;
  created_count?: number;
  updated_count?: number;
  uploaded_count?: number;
  errors?: string[];
  created?: Array<{name: string; email: string; username: string}>;
  updated?: Array<{name: string; email: string; username: string}>;
}

interface Branch {
  id: number;
  name: string;
  hod?: { id: string; first_name: string; last_name: string };
  semesters: number[];
  sections: { name: string; semester: number }[];
}

interface ManageBranchesResponse {
  success: boolean;
  message?: string;
  branches?: Branch[];
  branch?: Branch;
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Branch[];
}

interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
  student_count: number;
  created_at: string;
}

interface ManageBatchesResponse {
  success: boolean;
  message?: string;
  batches?: Batch[];
  batch?: Batch;
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Batch[];
}

interface ManageBatchesRequest {
  start_year?: number;
  end_year?: number;
  page?: number;
  page_size?: number;
  search?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  target_role: string;
  created_at: string;
  scheduled_at?: string;
}

interface ManageNotificationsResponse {
  success?: boolean;
  message?: string;
  notifications?: Notification[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    success: boolean;
    notifications: Notification[];
  };
}

interface HODLeave {
  id: number;
  faculty: { id: string; first_name: string; last_name: string };
  branch: { id: number; name: string };
  start_date: string;
  end_date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface ManageHODLeavesResponse {
  success: boolean;
  message?: string;
  leaves?: HODLeave[];
  leave?: {
    id: number;
    hod_name: string;
    branch: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    submitted_at: string;
  };
  calendar?: { date: string; leaves: { id: number; hod: string; status: string }[] }[];
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  extra: {
    usn?: string;
    branch?: string;
    branches?: string[];
  };
}

interface ManageUsersResponse {
  success: boolean;
  message?: string;
  users?: User[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: User[];
}

interface ManageAdminProfileRequest {
  user_id: string;
  action?: string;
  updates?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    mobile_number?: string;
    address?: string;
    bio?: string;
  };
}

interface ManageAdminProfileResponse {
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

let adminStatsPromise: Promise<AdminStatsResponse> | null = null;
let adminStatsTimestamp = 0;

export const getAdminStats = async (): Promise<AdminStatsResponse> => {
  const now = Date.now();
  if (adminStatsPromise && now - adminStatsTimestamp < 5000) {
    return adminStatsPromise;
  }

  adminStatsPromise = (async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/stats-overview/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Get Admin Stats Failed:", { status: response.status, result });
        return { success: false, message: result.message || `HTTP ${response.status}` };
      }
      return result;
    } catch (error) {
      console.error("Get Admin Stats Error:", error);
      return { success: false, message: "Network error" };
    }
  })();
  
  adminStatsTimestamp = now;
  return adminStatsPromise;
};

export const enrollUser = async (data: EnrollUserRequest): Promise<EnrollUserResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/enroll-user/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Enroll User Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Enroll User Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const bulkUploadFaculty = async (file: File): Promise<BulkUploadFacultyResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/bulk-upload-faculty/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Bulk Upload Faculty Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Bulk Upload Faculty Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageBranches = async (
  data?: { page?: number; page_size?: number; name?: string; hod_id?: string },
  branch_id?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<ManageBranchesResponse> => {
  try {
    let url = branch_id
      ? `${API_ENDPOINT}/admin/branches/${branch_id}/`
      : `${API_ENDPOINT}/admin/branches/`;
    
    // Add pagination parameters for GET requests
    if (method === "GET" && data && !branch_id) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if ((data as any).search) params.append('search', (data as any).search);
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    };
    const bodyPayload = (method !== "GET" && data) ? JSON.stringify(data) : undefined;
    if (bodyPayload) headers['Content-Type'] = 'application/json';

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers,
      body: bodyPayload,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Branches Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Branches Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface HODUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface BranchesWithHODsResponse {
  success: boolean;
  message?: string;
  branches?: Branch[];
  hods?: HODUser[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Branch[];
}

export const getBranchesWithHODs = async (
  data?: { page?: number; page_size?: number; search?: string }
): Promise<BranchesWithHODsResponse> => {
  try {
    let url = `${API_ENDPOINT}/admin/branches-with-hods/`;

    // Build query params (include compact=true by default to reduce payload)
    const params = new URLSearchParams();
    params.append('compact', 'true');
    if (data) {
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (data.search) params.append('search', data.search);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const response = await fetchWithTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Get Branches with HODs Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Get Branches with HODs Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageBatches = async (
  data?: ManageBatchesRequest,
  batch_id?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<ManageBatchesResponse> => {
  try {
    let url = batch_id
      ? `${API_ENDPOINT}/admin/batches/${batch_id}/`
      : `${API_ENDPOINT}/admin/batches/`;
    
    // Add pagination and filter parameters for GET requests
    if (method === "GET" && data && !batch_id) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (data.start_year) params.append('start_year', data.start_year.toString());
      if (data.end_year) params.append('end_year', data.end_year.toString());
      if (data.search) params.append('search', data.search);
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: (method !== "GET" && data) ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Batches Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Batches Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageNotifications = async (
  data?: { page?: number; page_size?: number },
  method: "GET" | "POST" = "GET"
): Promise<ManageNotificationsResponse> => {
  try {
    let url = `${API_ENDPOINT}/admin/notifications/`;
    
    // Add pagination parameters for GET requests
    if (method === "GET" && data) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: (method === "POST" && data) ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Notifications Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Notifications Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageHODLeaves = async (
  data?: any,
  method: "GET" | "POST" = "GET"
): Promise<ManageHODLeavesResponse> => {
  try {
    let url = `${API_ENDPOINT}/admin/hod-leaves/`;
    
    // Add query parameters for GET requests
    if (method === "GET" && data) {
      const params = new URLSearchParams();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key].toString());
        }
      });
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: (method === "POST" && data) ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage HOD Leaves Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage HOD Leaves Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageUsers = async (
  data?: { page?: number; page_size?: number; role?: string; is_active?: boolean; search?: string },
  method: "GET" | "POST" = "GET"
): Promise<ManageUsersResponse> => {
  try {
    let url = `${API_ENDPOINT}/admin/users/`;
    
    // Add pagination and filter parameters for GET requests
    if (method === "GET" && data) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (data.role) params.append('role', data.role);
      if (data.is_active !== undefined) params.append('is_active', data.is_active.toString());
      if (data.search) params.append('search', data.search);
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: (method === "POST" && data) ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Users Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Users Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface ManageUserActionRequest {
  user_id: string;
  action: 'edit' | 'deactivate' | 'delete';
  updates?: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ManageUserActionResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    extra: {
      usn?: string;
      branch?: string;
      branches?: string[];
    };
  };
}

export const manageUserAction = async (data: ManageUserActionRequest): Promise<ManageUserActionResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage User Action Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage User Action Error:", error);
    return { success: false, message: "Network error" };
  }
};

export const manageAdminProfile = async (
  data: ManageAdminProfileRequest,
  method: "GET" | "POST" = "POST"
): Promise<ManageAdminProfileResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/profile/${data.user_id}/`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      // avoid conditional requests for profile GETs in production
      cache: method === 'GET' ? 'no-store' : undefined,
      body: method === "POST" ? JSON.stringify(data) : undefined,
    });

    // Handle 304 Not Modified: return cached profile if available
    if (response.status === 304) {
      try {
        const cached = localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          return { success: true, profile: parsed } as ManageAdminProfileResponse;
        }
        return { success: false, message: 'Profile not modified and no cached profile available' } as ManageAdminProfileResponse;
      } catch (e) {
        console.error('Error reading cached admin profile', e);
        return { success: false, message: 'Profile not modified and failed to read cache' } as ManageAdminProfileResponse;
      }
    }

    let result: any = null;
    try {
      result = await response.json();
    } catch (e) {
      console.warn('manageAdminProfile: response had no JSON body', e);
    }

    if (!response.ok) {
      console.error("Manage Admin Profile Failed:", { status: response.status, result });
      return { success: false, message: (result && result.message) || `HTTP ${response.status}` };
    }

    return result;
  } catch (error) {
    console.error("Manage Admin Profile Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface BulkUserAction {
  user_id: string;
  action: 'edit' | 'deactivate' | 'delete';
  updates?: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface BulkUserActionsRequest {
  actions: BulkUserAction[];
}

interface BulkUserActionsResponse {
  success: boolean;
  message?: string;
  results?: Array<{
    user_id: string;
    action: string;
    success: boolean;
    message: string;
  }>;
  summary?: {
    total_actions: number;
    successful: number;
    errors: number;
  };
}

export const bulkUserActions = async (data: BulkUserActionsRequest): Promise<BulkUserActionsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/bulk-actions/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Bulk User Actions Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Bulk User Actions Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface BulkHODLeaveAction {
  leave_id: number;
  action: 'APPROVED' | 'REJECTED';
}

interface BulkHODLeaveActionsRequest {
  actions: BulkHODLeaveAction[];
}

interface BulkHODLeaveActionsResponse {
  success: boolean;
  message?: string;
  results?: Array<{
    leave_id: number;
    action: string;
    success: boolean;
    message: string;
  }>;
  summary?: {
    total_actions: number;
    successful: number;
    errors: number;
  };
}

export const bulkProcessHODLeaves = async (data: BulkHODLeaveActionsRequest): Promise<BulkHODLeaveActionsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-leaves/bulk-process/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Bulk HOD Leave Processing Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Bulk HOD Leave Processing Error:", error);
    return { success: false, message: "Network error" };
  }
};

// Admin Leave Interfaces
interface AdminLeaveRequest {
  title: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface AdminLeave {
  id: number;
  title: string;
  date: string;
  reason: string;
  status: string;
}

interface AdminLeaveApplicationsResponse {
  success: boolean;
  message?: string;
  data?: AdminLeave[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: AdminLeave[];
}

interface AdminLeaveApplicationsRequest {
  title: string;
  start_date: string;
  end_date: string;
  reason: string;
}

// Admin Leave Functions
export const adminLeaveApplications = async (
  data?: AdminLeaveApplicationsRequest,
  method: "GET" | "POST" = "GET"
): Promise<AdminLeaveApplicationsResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/leave-applications/`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: method === "POST" && data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Admin Leave Applications Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Admin Leave Applications Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface ManageAdminProfilePatchRequest {
  user_id: string;
  updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    mobile_number?: string;
    address?: string;
    bio?: string;
  };
}

interface ManageAdminProfilePatchResponse {
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
  changes?: Record<string, any>;
}

export const manageAdminProfilePatch = async (data: ManageAdminProfilePatchRequest): Promise<ManageAdminProfilePatchResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/profile/${data.user_id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Admin Profile PATCH Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Admin Profile PATCH Error:", error);
    return { success: false, message: "Network error" };
  }
};

interface CampusLocation {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  min_latitude?: number;
  max_latitude?: number;
  min_longitude?: number;
  max_longitude?: number;
  created_at: string;
  updated_at: string;
}

interface ManageCampusLocationResponse {
  success: boolean;
  message?: string;
  location?: CampusLocation;
  locations?: CampusLocation[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: CampusLocation[];
}

export const manageCampusLocation = async (
  data?: {
    name?: string;
    description?: string;
    is_active?: boolean;
    center_latitude?: number;
    center_longitude?: number;
    radius_meters?: number;
    min_latitude?: number;
    max_latitude?: number;
    min_longitude?: number;
    max_longitude?: number;
    page?: number;
    page_size?: number;
  },
  location_id?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<ManageCampusLocationResponse> => {
  try {
    let url = location_id
      ? `${API_ENDPOINT}/admin/campus-locations/${location_id}/`
      : `${API_ENDPOINT}/admin/campus-locations/`;

    // Add pagination parameters for GET requests
    if (method === "GET" && data && !location_id) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (params.toString()) url += `?${params.toString()}`;
    }

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: (method !== "GET" && data) ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Manage Campus Location Failed:", { status: response.status, result });
      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {
    console.error("Manage Campus Location Error:", error);
    return { success: false, message: "Network error" };
  }
};