import { API_BASE_URL } from '../../utils/config';

// PDF generation + email sending can take up to 60s on first run
const SUBMIT_TIMEOUT_MS = 90_000;

export const submitNDAConsent = async (data: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/public/nda-consent/submit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server is taking too long — please try again.');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // DRF returns field-level errors as { field: ["msg"] } — flatten them for display
    if (typeof errorData === 'object' && errorData !== null) {
      const messages: string[] = [];
      for (const [field, errors] of Object.entries(errorData)) {
        if (Array.isArray(errors)) {
          messages.push(`${field}: ${errors.join(', ')}`);
        } else if (typeof errors === 'string') {
          messages.push(`${field}: ${errors}`);
        } else if (typeof errors === 'object') {
          messages.push(JSON.stringify(errors));
        }
      }
      if (messages.length > 0) {
        throw new Error(messages.join('\n'));
      }
    }
    throw new Error('Failed to submit NDA & Consent');
  }

  return response.json();
};
