import { fetchWithTokenRefresh } from './authService';
import { API_ENDPOINT } from './config';

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
  errors?: any;
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
method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET')
: Promise<ManageCampusLocationResponse> => {
  try {
    let url = location_id ?
    `${API_ENDPOINT}/dean/campus-locations/${location_id}/` :
    `${API_ENDPOINT}/dean/campus-locations/`;

    // Add pagination parameters for GET requests
    if (method === 'GET' && data && !location_id) {
      const params = new URLSearchParams();
      if (data.page) params.append('page', data.page.toString());
      if (data.page_size) params.append('page_size', data.page_size.toString());
      if (params.toString()) url += `?${params.toString()}`;
    }

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: method !== 'GET' && data ? JSON.stringify(data) : undefined
    });
    const result = await response.json();
    if (!response.ok) {

      return { success: false, message: result.message || `HTTP ${response.status}`, errors: result.errors };
    }

    // Normalize paginated responses: DRF paginator returns {count, next, previous, results}
    // In some views results may wrap the payload (e.g., results: { success: true, locations: [...] })
    if (result && result.results) {
      // If results is an object with success flag, unwrap it and attach pagination metadata
      if (!Array.isArray(result.results) && typeof result.results === 'object' && 'success' in result.results) {
        return {
          ...result.results,
          count: result.count,
          next: result.next,
          previous: result.previous
        } as unknown as ManageCampusLocationResponse;
      }

      // If results is an array, return it under results
      return result as unknown as ManageCampusLocationResponse;
    }

    return result;
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

// Admin Leaves Management for Dean
interface AdminLeave {
  id: number;
  faculty_name: string;
  department: string;
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: string;
}

interface ManageAdminLeavesResponse {
  success: boolean;
  message?: string;
  data?: AdminLeave[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: AdminLeave[];
  updated_leave?: {
    id: number;
    status: string;
    reviewed_at: string;
    reviewed_by: string;
  };
  pending_leaves_count?: number;
}

interface ManageAdminLeavesRequest {
  action?: string;
  leave_id?: number;
  status?: string;
}

export const manageAdminLeaves = async (
data?: any,
method: 'GET' | 'PATCH' = 'GET',
page?: number)
: Promise<ManageAdminLeavesResponse> => {
  try {
    let url = `${API_ENDPOINT}/dean/admin-leaves/`;
    if (method === 'GET') {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (data?.status_type) params.append('status_type', data.status_type);
      if (params.toString()) url += `?${params.toString()}`;
    }

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: method === 'PATCH' && data ? JSON.stringify(data) : undefined
    });
    const result = await response.json();
    if (!response.ok) {

      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

// COE Leaves Management for Dean
interface COELeave {
  id: number;
  faculty_name: string;
  department: string;
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: string;
}

interface ManageCOELeavesResponse {
  success: boolean;
  message?: string;
  data?: COELeave[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: COELeave[];
  updated_leave?: {
    id: number;
    status: string;
    reviewed_at: string;
    reviewed_by: string;
  };
  pending_leaves_count?: number;
}

interface ManageCOELeavesRequest {
  action?: string;
  leave_id?: number;
  status?: string;
}

export const manageCOELeaves = async (
data?: any,
method: 'GET' | 'PATCH' = 'GET',
page?: number)
: Promise<ManageCOELeavesResponse> => {
  try {
    let url = `${API_ENDPOINT}/dean/coe-leaves/`;
    if (method === 'GET') {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (data?.status_type) params.append('status_type', data.status_type);
      if (params.toString()) url += `?${params.toString()}`;
    }

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: method === 'PATCH' && data ? JSON.stringify(data) : undefined
    });
    const result = await response.json();
    if (!response.ok) {

      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};

// All Leaves Management for Dean (Combined)
interface AllLeave {
  id: number;
  faculty_name: string;
  department: string;
  faculty_type: 'principal' | 'coe' | 'fees_manager';
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
}

interface ManageAllLeavesResponse {
  success: boolean;
  message?: string;
  data?: AllLeave[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: AllLeave[];
  updated_leave?: {
    id: number;
    status: string;
    reviewed_at: string;
    reviewed_by: string;
  };
  pending_leaves_count?: number;
}

interface ManageAllLeavesRequest {
  action?: string;
  leave_id?: number;
  status?: string;
}

export const manageAllLeaves = async (
data?: any,
method: 'GET' | 'PATCH' = 'GET',
page?: number)
: Promise<ManageAllLeavesResponse> => {
  try {
    let url = `${API_ENDPOINT}/dean/all-leaves/`;
    if (method === 'GET') {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (data?.status_type) params.append('status_type', data.status_type);
      if (params.toString()) url += `?${params.toString()}`;
    }

    const response = await fetchWithTokenRefresh(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: method === 'PATCH' && data ? JSON.stringify(data) : undefined
    });
    const result = await response.json();
    if (!response.ok) {

      return { success: false, message: result.message || `HTTP ${response.status}` };
    }
    return result;
  } catch (error) {

    return { success: false, message: 'Network error' };
  }
};