import { API_ENDPOINT } from '../utils/config';
import { fetchWithSuperadminTokenRefresh } from '../utils/authService';

export interface IssuedCertificate {
  id: number;
  certificate_id: string;
  certificate_type: 'INTERNSHIP' | 'COURSE' | 'WORKSHOP' | 'PARTICIPATION' | 'ACHIEVEMENT' | 'EXPERIENCE';
  student_name: string;
  email: string;
  company_name: string;
  internship_role?: string;
  course_name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  issue_date: string;
  status: 'Verified' | 'Revoked' | 'Expired';
  verification_url: string;
  pdf_url?: string;
  created_at: string;
}

export interface ListCertificatesResponse {
  count: number;
  results: IssuedCertificate[];
}

const apiGet = async <T>(url: string): Promise<T> => {
  const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}${url}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return response.json();
};

const apiPost = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return response.json();
};

const apiPut = async <T>(url: string, body?: any): Promise<T> => {
  const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return response.json();
};

export const certificateApi = {
  createCertificate: (data: Partial<IssuedCertificate>) => 
    apiPost<{ message: string; certificate_id: string; pdf_url: string }>('/certificates/create/', data),
    
  listCertificates: (params: { search?: string; type?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.type) searchParams.append('type', params.type);
    if (params.status) searchParams.append('status', params.status);
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());
    
    const queryStr = searchParams.toString();
    return apiGet<ListCertificatesResponse>(`/certificates/${queryStr ? `?${queryStr}` : ''}`);
  },
  
  revokeCertificate: (certificateId: string) => 
    apiPut<{ message: string; status: string }>(`/certificates/revoke/${certificateId}/`),
};
