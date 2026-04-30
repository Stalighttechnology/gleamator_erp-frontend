// api.ts
import { ApiResponse } from './types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Enquiry endpoints
  getEnquiries: () => request<any[]>('/api/enquiry/enquiries/'),
  createEnquiry: (data: any) =>
    request<any>('/api/enquiry/enquiries/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteEnquiry: (id: number) =>
    request<any>(`/api/enquiry/enquiries/${id}/delete/`, { method: 'DELETE' }),
  convertEnquiry: (id: number) =>
    request<any>(`/api/enquiry/enquiries/${id}/convert/`, { method: 'POST' }),

  // Progress endpoints
  getProgress: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any[]>(`/api/enquiry/progress/?${query}`);
  },
  toggleCompletion: (id: number) =>
    request<any>(`/api/enquiry/progress/${id}/toggle/`, { method: 'POST' }),
  getStudentProgress: () => request<any>('/api/enquiry/progress/me/'),
};