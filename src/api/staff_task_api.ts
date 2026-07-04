import { API_ENDPOINT } from '../utils/config';
import { fetchWithTokenRefresh } from '../utils/authService';

export interface StaffTask {
  id: number;
  title: string;
  description: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  due_date: string;
  created_at: string;
  assigned_by: number;
  assigned_by_name: string;
  assigned_by_role: string;
  assigned_to: number;
  assigned_to_name: string;
  assigned_to_role: string;
}

const apiGet = async <T>(url: string): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`);
  if (!response.ok) throw new Error('API Error');
  return await response.json();
};

const apiPost = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('API Error');
  return await response.json();
};

const apiPatch = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('API Error');
  return await response.json();
};

export const staffTaskApi = {
  getTasks: (type?: 'received' | 'assigned', page: number = 1) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    query.append('page', page.toString());
    return apiGet<{count: number; next: string | null; previous: string | null; results: StaffTask[]}>(`/staff-tasks/?${query.toString()}`);
  },
  createTask: (data: Partial<StaffTask>) => apiPost<StaffTask>('/staff-tasks/', data),
  updateTaskStatus: (id: number, status: string) => apiPatch<StaffTask>(`/staff-tasks/${id}/`, { status }),
  getSubordinates: (params?: { page?: number; search?: string; branch_id?: string; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    return apiGet<{count: number; next: string | null; previous: string | null; results: {id: number, name: string, role: string}[]}>(`/staff-tasks/subordinates/?${query.toString()}`);
  }
};
