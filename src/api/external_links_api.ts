import { API_ENDPOINT } from '../utils/config';
import { fetchWithTokenRefresh } from '../utils/authService';

export interface ExternalLink {
  id: number;
  name: string;
  url: string;
  description?: string;
  category: string;
  icon: string;
  status: 'Active' | 'Inactive';
  display_order?: number;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
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

const apiPut = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'PUT',
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
  return await response.json();
};

export const externalLinksApi = {
  getExternalLinks: () => {
    return apiGet<{success: boolean; links: ExternalLink[]}>(`/admin/external-links/`);
  },
  createExternalLink: (data: Partial<ExternalLink>) => {
    return apiPost<{success: boolean; link: ExternalLink}>(`/admin/external-links/`, data);
  },
  updateExternalLink: (id: number, data: Partial<ExternalLink>) => {
    return apiPut<{success: boolean; link: ExternalLink}>(`/admin/external-links/${id}/`, data);
  },
  deleteExternalLink: (id: number) => {
    return apiDelete<{success: boolean; message: string}>(`/admin/external-links/${id}/`);
  }
};
