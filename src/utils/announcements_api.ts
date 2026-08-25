import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

// Type definitions
export interface Announcement {
  id: number;
  title: string;
  message: string;
  created_by: number;
  created_by_name: string;
  created_by_role: string;
  is_global: boolean;
  branch: number | null;
  branch_name: string | null;
  section: number | null;
  section_name: string | null;
  target_roles: string[];
  is_active: boolean;
  expires_at: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  read_count: number;
  is_expired: boolean;
  is_read?: boolean;
  gate_pass?: number | null;
  exam_data?: any[];
  is_emergency?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  incident_id?: number | null;
  is_circular?: boolean;
  circular_number?: string | null;
  circular_category?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

export interface AnnouncementListResponse {
  count: number;
  page: number;
  page_size: number;
  results: Announcement[];
}

export interface SplitAnnouncementResponse {
  my_announcements: AnnouncementListResponse;
  received_announcements: AnnouncementListResponse;
}

export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  target_roles: string[];
  is_global: boolean;
  branch?: number | null;
  section?: number | null;
  expires_at?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  is_circular?: boolean;
  circular_number?: string;
  circular_category?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

export interface AnnouncementStats {
  total: number;
  by_priority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  expiring_soon: number;
}

// Fetch announcements visible to user (split into my/received)
export const fetchAnnouncements = async (
  options: any = {}) => {
  let page: any = 1;
  let pageSize: any = 20;
  let myPage: any;
  let receivedPage: any;
  let includeInactive = false;
  let includeExpired = false;
  let isCircular: any = undefined;
  let circularCategory: any = undefined;
  let search: any = undefined;

  // Handle both legacy positional arguments and modern options object
  if (typeof options === 'object' && options !== null && !Array.isArray(options)) {
    // If it's a React event or something similar that we shouldn't treat as options
    if ('nativeEvent' in options || 'target' in options) {
      page = 1;
    } else {
      page = options.page ?? 1;
      pageSize = options.pageSize ?? 20;
      myPage = options.myPage;
      receivedPage = options.receivedPage;
      includeInactive = options.includeInactive ?? false;
      includeExpired = options.includeExpired ?? false;
      isCircular = options.is_circular ?? options.isCircular;
      circularCategory = options.circular_category ?? options.circularCategory;
      search = options.search ?? options.q;
    }
  } else if (typeof options === 'number') {
    page = options;
    // For legacy support of fetchAnnouncements(page, pageSize, includeInactive, includeExpired)
    // We can use the 'arguments' object if we want to be fully compatible
    if (arguments.length > 1) pageSize = arguments[1];
    if (arguments.length > 2) includeInactive = arguments[2];
    if (arguments.length > 3) includeExpired = arguments[3];
  }

  // Extra safety: ensure page and pageSize are numbers to avoid [object Object]
  const safePage = typeof page === 'number' || typeof page === 'string' && !isNaN(Number(page)) ? page : 1;
  const safePageSize = typeof pageSize === 'number' || typeof pageSize === 'string' && !isNaN(Number(pageSize)) ? pageSize : 20;

  try {
    const params = new URLSearchParams({
      page: String(safePage),
      page_size: String(safePageSize),
      include_inactive: String(includeInactive),
      include_expired: String(includeExpired),
      _t: String(Date.now())
    });

    if (myPage !== undefined && myPage !== null) params.append("my_page", String(myPage));
    if (receivedPage !== undefined && receivedPage !== null) params.append("received_page", String(receivedPage));
    if (isCircular !== undefined && isCircular !== null) params.append("is_circular", String(isCircular));
    if (circularCategory && circularCategory !== 'all') params.append("circular_category", String(circularCategory));
    if (search) params.append("search", String(search));

    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/?${params.toString()}`,
      {
        method: "GET"
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data: SplitAnnouncementResponse = await response.json();
    return { success: true, data, message: "Announcements fetched" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch announcements"
    };
  }
};

// Fetch official circulars with category filtering and indexing
export const fetchCirculars = async (options: {
  page?: number;
  pageSize?: number;
  myPage?: number;
  receivedPage?: number;
  circular_category?: string;
  search?: string;
  includeInactive?: boolean;
  includeExpired?: boolean;
} = {}) => {
  return fetchAnnouncements({
    ...options,
    is_circular: true,
  });
};

// Create announcement
export const createAnnouncement = async (payload: CreateAnnouncementRequest) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Handle flat error fields first
      if (error.error || error.message || error.detail) {
        throw new Error(error.error || error.message || error.detail);
      }
      // Handle DRF field-level validation errors: { title: ["Too long."], message: ["..."] }
      if (typeof error === 'object' && error !== null) {
        const fieldErrors = Object.entries(error)
          .map(([field, msgs]) => {
            const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
            const msg = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return `${label}: ${msg}`;
          })
          .join('\n');
        if (fieldErrors) throw new Error(fieldErrors);
      }
      throw new Error("Failed to create announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement created successfully" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to create announcement"
    };
  }
};

// Update announcement
export const updateAnnouncement = async (
  announcementId: number,
  payload: Partial<CreateAnnouncementRequest>) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to update announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement updated successfully" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to update announcement"
    };
  }
};

// Delete announcement
export const deleteAnnouncement = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to delete announcement");
    }

    return { success: true, message: "Announcement deleted successfully" };
  } catch (error: any) {

    return {
      success: false,
      message: error.message || "Failed to delete announcement"
    };
  }
};

// Toggle announcement active status
export const toggleAnnouncementActive = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/toggle-active/`,
      {
        method: "POST"
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to toggle announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement status updated" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to toggle announcement"
    };
  }
};

// Mark announcement as read
export const markAnnouncementRead = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/mark-read/`,
      {
        method: "POST"
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to mark as read");
    }

    return { success: true, message: "Marked as read" };
  } catch (error: any) {

    return {
      success: false,
      message: error.message || "Failed to mark as read"
    };
  }
};

// Get readers of announcement
export const getAnnouncementReaders = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/readers/`,
      {
        method: "GET"
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch readers: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data, message: "Readers fetched" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch readers"
    };
  }
};

// Get announcement statistics (admin only)
export const getAnnouncementStats = async (branchId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/branches/${branchId}/announcements/stats/`,
      {
        method: "GET"
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const data: AnnouncementStats = await response.json();
    return { success: true, data, message: "Stats fetched" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch statistics"
    };
  }
};

// Admin: Get all announcements
export const getAllAnnouncements = async (
  page = 1,
  pageSize = 50,
  filters?: {
    is_active?: boolean;
    is_global?: boolean;
    branch?: number;
    priority?: string;
  }) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });

    if (filters) {
      if (filters.is_active !== undefined) params.append("is_active", String(filters.is_active));
      if (filters.is_global !== undefined) params.append("is_global", String(filters.is_global));
      if (filters.branch) params.append("branch", String(filters.branch));
      if (filters.priority) params.append("priority", filters.priority);
    }

    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/admin/manage/?${params.toString()}`,
      {
        method: "GET"
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data: AnnouncementListResponse = await response.json();
    return { success: true, data, message: "Announcements fetched" };
  } catch (error: any) {

    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch announcements"
    };
  }
};