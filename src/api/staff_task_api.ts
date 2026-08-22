import { API_ENDPOINT } from '../utils/config';
import { fetchWithTokenRefresh } from '../utils/authService';

export interface TaskStatusHistory {
  status: string;
  note: string;
  updated_by?: string;
  timestamp?: string;
}

export interface StaffTask {
  id: number;
  title: string;
  description: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'under_review' | 'on_hold' | 'completed' | 'cancelled' | string;
  notes?: string;
  status_history?: TaskStatusHistory[];
  due_date: string;
  created_at: string;
  assigned_by: number;
  assigned_by_name: string;
  assigned_by_role: string;
  assigned_to: number;
  assigned_to_name: string;
  assigned_to_role: string;
  completed_at?: string;
}

const apiGet = async <T>(url: string): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || JSON.stringify(err) || 'API Error');
  }
  return await response.json();
};

const apiPost = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || JSON.stringify(err) || 'API Error');
  }
  return await response.json();
};

const apiPatch = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || JSON.stringify(err) || 'API Error');
  }
  return await response.json();
};

const apiDelete = async <T>(url: string): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || JSON.stringify(err) || 'API Error');
  }
  return response.status === 204 ? ({} as T) : await response.json().catch(() => ({} as T));
};

export const staffTaskApi = {
  getTasks: (type?: 'received' | 'assigned', page: number = 1, category?: string) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    query.append('page', page.toString());
    if (category && category !== 'all') query.append('category', category);
    return apiGet<{count: number; next: string | null; previous: string | null; results: StaffTask[]}>(`/staff-tasks/?${query.toString()}`);
  },
  createTask: (data: Partial<StaffTask>) => apiPost<StaffTask>('/staff-tasks/', data),
  updateTask: (id: number, data: Partial<StaffTask>) => apiPatch<StaffTask>(`/staff-tasks/${id}/`, data),
  deleteTask: (id: number) => apiDelete<{ success: boolean; message?: string }>(`/staff-tasks/${id}/`),
  updateTaskStatus: (id: number, status: string, notes?: string) => apiPatch<StaffTask>(`/staff-tasks/${id}/`, { status, notes }),
  getSubordinates: (params?: { page?: number; search?: string; target_role?: string; branch_id?: string; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.target_role) query.append('target_role', params.target_role);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    return apiGet<{count: number; next: string | null; previous: string | null; results: {id: number, name: string, role: string}[]}>(`/staff-tasks/subordinates/?${query.toString()}`);
  }
};
