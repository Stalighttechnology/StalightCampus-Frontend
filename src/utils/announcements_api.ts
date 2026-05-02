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
  target_roles: string[];
  is_active: boolean;
  expires_at: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  read_count: number;
  is_expired: boolean;
  is_read?: boolean;
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
  expires_at?: string;
  priority?: "low" | "normal" | "high" | "urgent";
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
  page = 1, 
  pageSize = 20, 
  includeInactive = false, 
  includeExpired = false
) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      include_inactive: String(includeInactive),
      include_expired: String(includeExpired),
    });

    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/?${params.toString()}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data: SplitAnnouncementResponse = await response.json();
    return { success: true, data, message: "Announcements fetched" };
  } catch (error: any) {
    console.error("Error fetching announcements:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch announcements",
    };
  }
};

// Create announcement
export const createAnnouncement = async (payload: CreateAnnouncementRequest) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to create announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement created successfully" };
  } catch (error: any) {
    console.error("Error creating announcement:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to create announcement",
    };
  }
};

// Update announcement
export const updateAnnouncement = async (
  announcementId: number,
  payload: Partial<CreateAnnouncementRequest>
) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to update announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement updated successfully" };
  } catch (error: any) {
    console.error("Error updating announcement:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to update announcement",
    };
  }
};

// Delete announcement
export const deleteAnnouncement = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to delete announcement");
    }

    return { success: true, message: "Announcement deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting announcement:", error);
    return {
      success: false,
      message: error.message || "Failed to delete announcement",
    };
  }
};

// Toggle announcement active status
export const toggleAnnouncementActive = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/toggle-active/`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to toggle announcement");
    }

    const data: Announcement = await response.json();
    return { success: true, data, message: "Announcement status updated" };
  } catch (error: any) {
    console.error("Error toggling announcement:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to toggle announcement",
    };
  }
};

// Mark announcement as read
export const markAnnouncementRead = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/mark-read/`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Failed to mark as read");
    }

    return { success: true, message: "Marked as read" };
  } catch (error: any) {
    console.error("Error marking announcement as read:", error);
    return {
      success: false,
      message: error.message || "Failed to mark as read",
    };
  }
};

// Get readers of announcement
export const getAnnouncementReaders = async (announcementId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/announcements/${announcementId}/readers/`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch readers: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data, message: "Readers fetched" };
  } catch (error: any) {
    console.error("Error fetching readers:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch readers",
    };
  }
};

// Get announcement statistics (admin only)
export const getAnnouncementStats = async (branchId: number) => {
  try {
    const response = await fetchWithTokenRefresh(
      `${API_ENDPOINT}/branches/${branchId}/announcements/stats/`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const data: AnnouncementStats = await response.json();
    return { success: true, data, message: "Stats fetched" };
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch statistics",
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
  }
) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
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
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data: AnnouncementListResponse = await response.json();
    return { success: true, data, message: "Announcements fetched" };
  } catch (error: any) {
    console.error("Error fetching announcements:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to fetch announcements",
    };
  }
};
