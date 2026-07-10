import { API_ENDPOINT } from '../utils/config';
import { fetchWithTokenRefresh } from '../utils/authService';

// Lead Types
export interface LeadActivity {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
  created_by: number;
  created_by_name?: string;
  enquiry: number;
}

export interface LeadTask {
  id: number;
  task_type: string;
  description: string;
  due_date: string;
  is_completed: boolean;
  assigned_to: number;
  assigned_to_name?: string;
  enquiry: number;
  created_by?: number;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  course_interested?: number;
  course_name?: string;
  status: string;
  priority: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  activities?: LeadActivity[];
  tasks?: LeadTask[];
}

const apiGet = async <T>(url: string): Promise<{ data: T }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`);
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return { data };
};

const apiPost = async <T>(url: string, body?: any): Promise<{ data: T }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return { data };
};

const apiPatch = async <T>(url: string, body?: any): Promise<{ data: T }> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('API Error');
  const data = await response.json();
  return { data };
};

export const crmApi = {
  // Leads
  getLeads: () => apiGet<Lead[]>('/admission/manager/enquiries/'),
  getLead: (id: number) => apiGet<Lead>(`/admission/manager/enquiries/${id}/`),
  createLead: (data: any) => apiPost('/admission/manager/enquiries/', data),
  updateLead: (id: number, data: any) => apiPatch(`/admission/manager/enquiries/${id}/`, data),
  updateLeadStatus: (id: number, status: string) => apiPost(`/admission/manager/enquiries/${id}/update_status/`, { status }),
  assignCounsellor: (id: number, counsellor_id: number) => apiPost(`/admission/manager/enquiries/${id}/assign_counsellor/`, { counsellor_id }),

  // Activities
  getActivities: (leadId: number) => apiGet<LeadActivity[]>(`/admission/manager/lead-activities/?enquiry=${leadId}`),
  createActivity: (data: any) => apiPost('/admission/manager/lead-activities/', data),

  // Tasks
  getTasks: (leadId?: number) => {
    const url = leadId ? `/admission/manager/lead-tasks/?enquiry=${leadId}` : '/admission/manager/lead-tasks/';
    return apiGet<LeadTask[]>(url);
  },
  createTask: (data: any) => apiPost('/admission/manager/lead-tasks/', data),
  markTaskCompleted: (id: number) => apiPost(`/admission/manager/lead-tasks/${id}/mark_completed/`),

  // Analytics
  getAnalytics: () => apiGet('/admission/manager/analytics/'),
};
