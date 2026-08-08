/**
 * developer_api.ts
 * API utilities for the Developer portal.
 * Developers authenticate via the same token system as superadmins,
 * with their token stored in localStorage under "superadmin_token".
 */

import { API_ENDPOINT } from "./config";
import { fetchWithSuperadminTokenRefresh } from "./authService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeveloperMyAttendanceRecord {
  id: string | number;
  date: string;
  status: string;
  marked_at?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_hours?: string | null;
  notes?: string;
  location?: {
    latitude?: string;
    longitude?: string;
    inside?: boolean | null;
    distance_meters?: number | null;
    campus_name?: string | null;
  } | null;
}

export interface MarkDeveloperMyAttendanceRequest {
  status: "present" | "absent";
  action?: "check_in" | "check_out";
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  device_info?: any;
  off_campus_reason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = (): string | null => localStorage.getItem("superadmin_token");

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Mark developer attendance (check-in / check-out / absent).
 */
export const markDeveloperMyAttendance = async (
  data: MarkDeveloperMyAttendanceRequest
): Promise<any> => {
  try {
    const response = await fetchWithSuperadminTokenRefresh(
      `${API_ENDPOINT}/developer/mark-attendance/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    return await response.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

/**
 * Fetch developer's own attendance records with optional filters and pagination.
 */
export const getDeveloperMyAttendanceRecords = async (params?: {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}): Promise<any> => {
  try {
    let url = `${API_ENDPOINT}/developer/my-attendance-records/`;
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.page_size)
        searchParams.append("page_size", params.page_size.toString());
      if (params.start_date)
        searchParams.append("start_date", params.start_date);
      if (params.end_date) searchParams.append("end_date", params.end_date);
      if (searchParams.toString()) url += `?${searchParams.toString()}`;
    }

    const response = await fetchWithSuperadminTokenRefresh(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const json = await response.json();

    // DRF PageNumberPagination wraps data in { count, next, previous, results: { success, data, stats } }
    if (
      json.results &&
      typeof json.results === "object" &&
      !Array.isArray(json.results)
    ) {
      return {
        ...json.results,
        count: json.count,
        next: json.next,
        previous: json.previous,
        pagination: {
          count: json.count,
          total_items: json.count,
          page_size: params?.page_size ?? 10,
          current_page: params?.page ?? 1,
          total_pages: Math.ceil(json.count / (params?.page_size ?? 10)),
        },
      };
    }

    return json;
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};
