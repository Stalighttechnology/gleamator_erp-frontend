import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export type ShortPermissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ShortPermissionItem {
  id: number;
  user_id?: number;
  user_name?: string;
  role?: string;
  request_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string;
  status: ShortPermissionStatus;
  remarks?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const createShortPermission = async (payload: {
  request_date: string;
  from_time: string;
  to_time: string;
  reason: string;
}) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/short-permissions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const getMyShortPermissions = async (params?: { page?: number; page_size?: number }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.append("page", String(params.page));
  if (params?.page_size) sp.append("page_size", String(params.page_size));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/short-permissions/my/${qs}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

export const getAdminShortPermissions = async (params?: {
  status?: ShortPermissionStatus | "ALL";
  role?: "teacher" | "hod" | "mis" | "ALL";
  request_date?: string;
  page?: number;
  page_size?: number;
}) => {
  const sp = new URLSearchParams();
  if (params?.status && params.status !== "ALL") sp.append("status", params.status);
  if (params?.role && params.role !== "ALL") sp.append("role", params.role);
  if (params?.request_date) sp.append("request_date", params.request_date);
  if (params?.page) sp.append("page", String(params.page));
  if (params?.page_size) sp.append("page_size", String(params.page_size));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/short-permissions/${qs}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

export const updateAdminShortPermission = async (
  id: number,
  status: "APPROVED" | "REJECTED",
  remarks: string
) => {
  const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/short-permissions/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, remarks }),
  });
  return response.json();
};
