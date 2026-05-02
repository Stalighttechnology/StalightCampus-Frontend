import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

interface Hostel {
  id: number;
  name: string;
  address: string;
  capacity: number;
  warden?: number;
}

interface HostelRoom {
  id: number;
  hostel: number;
  room_number: string;
  capacity: number;
  occupied: number;
  room_type: 'S' | 'D' | 'P' | 'B';
}

interface HostelStudent {
  id: number;
  user: number;
  name: string;
  usn: string;
  hostel: number;
  room: number;
  course: string;
  admission_date: string;
  room_number?: string;
  hostel_name?: string;
}

interface HostelWarden {
  id: number;
  user: number;
  name: string;
  hostel: number;
  hostel_name?: string;
}

interface HostelCourse {
  id: number;
  code: string;
  room_type: 'S' | 'D' | 'P' | 'B';
}

interface HMSResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// Generic HMS API function
const hmsApiCall = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any
): Promise<HMSResponse<T>> => {
  try {
    const url = `${API_ENDPOINT}/hms/${endpoint}`;

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    // Log cache information for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const etag = response.headers.get('ETag');
      const cacheControl = response.headers.get('Cache-Control');
      const dbQueryCount = response.headers.get('X-DB-Query-Count');
      const dbQueryTime = response.headers.get('X-DB-Query-Time');
      
      if (response.status === 304) {
        console.log(`[CACHE HIT] ${method} ${endpoint} - 304 Not Modified`);
      } else if (etag || cacheControl) {
        console.log(`[CACHE] ${method} ${endpoint}`, {
          status: response.status,
          etag: etag ? '✓' : '✗',
          cacheControl: cacheControl || 'none',
          dbQueries: dbQueryCount ? parseInt(dbQueryCount) : 'unknown',
          dbTime: dbQueryTime || 'unknown',
        });
      }
    }

    const result = response.status === 204 ? null : await response.json();
    
    // Handle successful DELETE (204 No Content)
    if (method === "DELETE" && response.status === 204) {
      return { success: true };
    }
    
    if (!response.ok) {
      console.error(`HMS API ${method} ${endpoint} Failed:`, { status: response.status, result });
      
      // Extract error message from different formats
      let errorMessage = `HTTP ${response.status}`;
      
      if (result && result.detail) {
        errorMessage = result.detail;
      } else if (result && result.message) {
        errorMessage = result.message;
      } else if (result && typeof result === 'object') {
        // Handle Django REST Framework validation errors
        // Format: { "field_name": ["error message"], "non_field_errors": ["error message"] }
        
        // Check for non_field_errors first (these are validation errors like unique constraint violations)
        if (result.non_field_errors && Array.isArray(result.non_field_errors)) {
          errorMessage = result.non_field_errors[0];
        } else {
          // Otherwise, use the first field error
          const errorEntries = Object.entries(result);
          if (errorEntries.length > 0) {
            // Collect all error messages for better debugging
            const errorMessages = errorEntries
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${(errors as string[]).join(', ')}`;
                } else if (typeof errors === 'string') {
                  return `${field}: ${errors}`;
                }
                return `${field}: ${JSON.stringify(errors)}`;
              });
            console.error('All validation errors:', errorMessages.join('; '));
            
            // For user display, show just the first error
            const firstError = errorEntries[0];
            if (Array.isArray(firstError[1])) {
              errorMessage = (firstError[1] as string[])[0];
            } else if (typeof firstError[1] === 'string') {
              errorMessage = firstError[1];
            }
          }
        }
      }
      
      return { success: false, message: errorMessage };
    }

    // Handle different response formats
    if (method === "GET" && Array.isArray(result)) {
      // List response (array)
      return { success: true, results: result, count: result.length };
    } else if (method === "GET" && result && result.results !== undefined) {
      // Paginated response with results field
      return {
        success: true,
        results: result.results,
        count: result.count,
        next: result.next,
        previous: result.previous,
      };
    } else {
      // Single object response
      return { success: true, data: result };
    }
  } catch (error) {
    console.error(`HMS API ${method} ${endpoint} Error:`, error);
    return { success: false, message: "Network error" };
  }
};

// Hostel Management
export const manageHostels = async (
  data?: Partial<Hostel>,
  hostelId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<Hostel>> => {
  const endpoint = hostelId ? `hostels/${hostelId}/` : "hostels/";
  return hmsApiCall<Hostel>(endpoint, method, data);
};

export const getHostels = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>("hostels/", "GET");
};

export const getHostelManagementInit = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>("hostel-init/", "GET");
};

// Fetch room details (including residents)
export const getRoomDetail = async (roomId: number): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`rooms/${roomId}/`, 'GET');
};

// Room Management
export const manageRooms = async (
  data?: Partial<HostelRoom>,
  roomId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  params?: Record<string, any>
): Promise<HMSResponse<HostelRoom>> => {
  let endpoint = roomId ? `rooms/${roomId}/` : "rooms/";

  // Add query parameters for GET requests
  if (method === "GET" && params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  return hmsApiCall<HostelRoom>(endpoint, method, data);
};

// Fetch rooms by hostel (new dedicated endpoint)
export const getRoomsByHostel = async (hostelId: number, floor?: number): Promise<HMSResponse<HostelRoom>> => {
  let endpoint = `rooms/by_hostel/?hostel_id=${hostelId}`;
  if (floor !== undefined && floor !== null) {
    endpoint += `&floor=${floor}`;
  }
  return hmsApiCall<HostelRoom>(endpoint, 'GET');
};

// Fetch floors by hostel
export const getFloorsByHostel = async (hostelId: number): Promise<HMSResponse<number>> => {
  const endpoint = `rooms/floors/?hostel_id=${hostelId}`;
  return hmsApiCall<number>(endpoint, 'GET');
};

// Student Management
export const manageHostelStudents = async (
  data?: Partial<HostelStudent>,
  studentId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  params?: Record<string, any>
): Promise<HMSResponse<HostelStudent>> => {
  let endpoint = studentId ? `students/${studentId}/` : "students/";

  // Add query parameters for GET requests
  if (method === "GET" && params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  return hmsApiCall<HostelStudent>(endpoint, method, data);
};

export const getAcademicInit = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>("students/get_academic_init/", "GET");
};

// Warden Management
export const manageWardens = async (
  data?: any,
  wardenId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<any>> => {
  const endpoint = wardenId ? `wardens/${wardenId}/` : "wardens/";
  return hmsApiCall<any>(endpoint, method, data);
};

// Caretaker Management
export const manageCaretakers = async (
  data?: any,
  caretakerId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<any>> => {
  const endpoint = caretakerId ? `caretakers/${caretakerId}/` : "caretakers/";
  return hmsApiCall<any>(endpoint, method, data);
};

// Dashboard Stats - Single endpoint for all dashboard data
export const getDashboardStats = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>("dashboard/stats/", "GET");
};

// Get rooms for a specific hostel
export const getRoomsByHostelId = async (hostelId: number, floor?: string): Promise<HMSResponse<any>> => {
  let endpoint = `hostels/${hostelId}/rooms/`;
  if (floor && floor !== 'all') {
    endpoint += `?floor=${floor}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

// Get current student's hostel details
export const getStudentHostelDetails = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`student/hostel-details/`, "GET");
};

// Get staff enrollment data (wardens and caretakers)
export const getStaffEnrollment = async (page: number = 1, pageSize: number = 50): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`staff/enrollment/?page=${page}&page_size=${pageSize}`, "GET");
};

// Course Management
export const manageCourses = async (
  data?: Partial<HostelCourse>,
  courseId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<HostelCourse>> => {
  const endpoint = courseId ? `courses/${courseId}/` : "courses/";
  return hmsApiCall<HostelCourse>(endpoint, method, data);
};

// =============================================
// MESS MANAGEMENT API FUNCTIONS
// =============================================

// Meal Types
export const getMealTypes = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`meal-types/`, "GET");
};

export const manageMealType = async (
  data?: any,
  mealTypeId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<any>> => {
  const endpoint = mealTypeId ? `meal-types/${mealTypeId}/` : "meal-types/";
  return hmsApiCall<any>(endpoint, method, data);
};

// Menu Items
export const getMenuItems = async (filters?: Record<string, any>): Promise<HMSResponse<any>> => {
  let endpoint = `menu-items/`;
  if (filters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) endpoint += `?${queryString}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

export const manageMenuItem = async (
  data?: any,
  itemId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<any>> => {
  const endpoint = itemId ? `menu-items/${itemId}/` : "menu-items/";
  return hmsApiCall<any>(endpoint, method, data);
};

// Menus (Weekly/Daily menus)
export const getMenus = async (filters?: Record<string, any>, page: number = 1): Promise<HMSResponse<any>> => {
  let endpoint = `menus/?page=${page}`;
  if (filters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) endpoint += `&${queryString}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

export const manageMenu = async (
  data?: any,
  menuId?: number,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
): Promise<HMSResponse<any>> => {
  const endpoint = menuId ? `menus/${menuId}/` : "menus/";
  return hmsApiCall<any>(endpoint, method, data);
};

export const getWeeklyMenu = async (): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`menus/weekly_menu/`, "GET");
};

export const getTodayMenu = async (hostelId?: number): Promise<HMSResponse<any>> => {
  let endpoint = `menus/today_menu/`;
  if (hostelId) endpoint += `?hostel=${hostelId}`;
  return hmsApiCall<any>(endpoint, "GET");
};

// Compact student-facing today's menu summary
export const getTodayMenuSummary = async (hostelId?: number): Promise<HMSResponse<any>> => {
  let endpoint = `menus/today_summary/`;
  if (hostelId) endpoint += `?hostel=${hostelId}`;
  return hmsApiCall<any>(endpoint, "GET");
};

// Student Meal Skips
export const getMealSkips = async (filters?: Record<string, any>, page: number = 1): Promise<HMSResponse<any>> => {
  let endpoint = `meal-skips/?page=${page}`;
  if (filters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) endpoint += `&${queryString}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

// Mess Billing
export const getMessBilling = async (filters?: Record<string, any>, page: number = 1): Promise<HMSResponse<any>> => {
  let endpoint = `mess-billing/?page=${page}`;
  if (filters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) endpoint += `&${queryString}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

export const getMyMessBilling = async (page: number = 1): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`mess-billing/my_billing/?page=${page}`, "GET");
};

export const getHostelMessStats = async (hostelId: number): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`mess-billing/hostel_stats/?hostel_id=${hostelId}`, "GET");
};

// Hostel Issue Tracking API

export const raiseIssue = async (data: {
  title: string;
  description: string;
  room: number;
}): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`issues/`, "POST", data);
};

export const getMyIssues = async (page: number = 1): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`issues/my_issues/?page=${page}`, "GET");
};

export const getIssues = async (filters?: {
  hostel_id?: number;
  status?: string;
  page?: number;
}): Promise<HMSResponse<any>> => {
  let endpoint = `issues/`;
  if (filters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) endpoint += `?${queryString}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

export const getIssueDetail = async (issueId: number): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`issues/${issueId}/`, "GET");
};

export const updateIssueStatus = async (
  issueId: number,
  data: {
    status: string;
    note?: string;
  }
): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`issues/${issueId}/`, "PATCH", data);
};

export const getHostelIssues = async (
  hostelId: number,
  status?: string,
  page: number = 1
): Promise<HMSResponse<any>> => {
  let endpoint = `issues/hostel_issues/?hostel_id=${hostelId}&page=${page}`;
  if (status) {
    endpoint += `&status=${status}`;
  }
  return hmsApiCall<any>(endpoint, "GET");
};

export const getIssueTimeline = async (issueId: number): Promise<HMSResponse<any>> => {
  return hmsApiCall<any>(`issues/${issueId}/timeline/`, "GET");
};