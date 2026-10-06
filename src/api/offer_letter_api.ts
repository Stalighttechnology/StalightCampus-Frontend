import { API_ENDPOINT } from '../utils/config';
import { fetchWithSuperadminTokenRefresh } from '../utils/authService';

export interface IssuedOfferLetter {
  id: number;
  offer_id: string;
  candidate_name: string;
  email: string;
  phone?: string;
  company_name: string;
  designation: string;
  department?: string;
  offer_type: 'FULL_TIME' | 'INTERNSHIP' | 'PART_TIME' | 'CONTRACT';
  date_of_joining: string;
  work_location: string;
  probation_period: string;
  minimum_commitment: string;
  salary_monthly: string;
  salary_annual_ctc?: string;
  salary_words: string;
  issue_date: string;
  expiry_date?: string;
  status: 'Issued' | 'Accepted' | 'Revoked' | 'Expired';
  verification_url: string;
  pdf_url?: string;
  created_at: string;
}

export interface ListOfferLettersResponse {
  count: number;
  results: IssuedOfferLetter[];
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

export const offerLetterApi = {
  createOfferLetter: (data: Partial<IssuedOfferLetter>) =>
    apiPost<{ message: string; offer_id: string; candidate_name: string; pdf_url: string }>('/offer-letters/create/', data),

  listOfferLetters: (params: { search?: string; type?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.type) searchParams.append('type', params.type);
    if (params.status) searchParams.append('status', params.status);
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

    const queryStr = searchParams.toString();
    return apiGet<ListOfferLettersResponse>(`/offer-letters/${queryStr ? `?${queryStr}` : ''}`);
  },

  getOfferLetter: (offerId: string) =>
    apiGet<IssuedOfferLetter>(`/offer-letters/${offerId}/`),

  updateOfferLetter: (offerId: string, data: Partial<IssuedOfferLetter>) =>
    apiPut<{ message: string; offer: IssuedOfferLetter }>(`/offer-letters/${offerId}/update/`, data),

  revokeOfferLetter: (offerId: string) =>
    apiPut<{ message: string; status: string }>(`/offer-letters/${offerId}/revoke/`),

  resendOfferEmail: (offerId: string) =>
    apiPost<{ message: string }>(`/offer-letters/${offerId}/resend-email/`),
};
