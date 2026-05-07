import { ApiResponse } from './types';
import { API_ENDPOINT } from '@/utils/config';
import { fetchWithTokenRefresh } from '@/utils/authService';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message || payload?.detail || `API Error: ${response.status}`;
    throw new Error(message);
  }

  // DRF list responses are plain arrays; keep component contract as { success, data }.
  if (Array.isArray(payload)) {
    return { success: true, data: payload as T };
  }

  return payload as ApiResponse<T>;
}

export const api = {
  getEnquiries: () => request<any[]>('/enquiry/enquiries/'),
  createEnquiry: (data: any) =>
    request<any>('/enquiry/enquiries/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteEnquiry: (id: number) =>
    request<any>(`/enquiry/enquiries/${id}/`, { method: 'DELETE' }),
  convertEnquiry: (id: number) =>
    request<any>(`/enquiry/enquiries/${id}/convert/`, { method: 'POST' }),
  getProgress: (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const suffix = query ? `?${query}` : '';
    return request<any[]>(`/enquiry/progress/${suffix}`);
  },
  toggleCompletion: (id: number) =>
    request<any>(`/enquiry/progress/${id}/toggle/`, { method: 'POST' }),
  updateProgress: (id: number, data: Record<string, unknown>) =>
    request<any>(`/enquiry/progress/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getStudentProgress: () => request<any>('/enquiry/progress/me/'),
};
