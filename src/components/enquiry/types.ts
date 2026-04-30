// types.ts
export interface Enquiry {
  id: number;
  name: string;
  phone: string;
  course: string;
  branch?: string;
  batch?: string;
  fee_status: 'paid' | 'pending';
  notes?: string;
  is_converted: boolean;
  created_at: string;
  created_by?: string;
}

export interface StudentProgress {
  id: number;
  enquiry_id?: number;
  student_name: string;
  course: string;
  branch?: string;
  batch?: string;
  status: 'completed' | 'pending';
  fee_status: 'paid' | 'pending';
  updated_at: string;
  updated_by?: string;
}

export type UserRole = 'mis' | 'counselor' | 'admin' | 'student';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  org?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}