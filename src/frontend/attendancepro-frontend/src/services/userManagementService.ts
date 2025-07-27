import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  profilePictureUrl?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  managerId?: string;
  managerName?: string;
  directReports?: User[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  roles: string[];
  managerId?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  roles?: string[];
  managerId?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface UserSearchFilters {
  search?: string;
  department?: string;
  position?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
  role?: string;
  managerId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'department' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'updateRole' | 'updateDepartment';
  data?: {
    roles?: string[];
    department?: string;
    managerId?: string;
  };
}

export interface UserHierarchy {
  id: string;
  name: string;
  position: string;
  department: string;
  directReports: UserHierarchy[];
  level: number;
}

export interface UserImportResult {
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  importedUsers: User[];
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  userCount: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount: number;
}

class UserManagementService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/UserManagement`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  constructor() {
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async getUsers(filters?: UserSearchFilters): Promise<UserListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      const response: AxiosResponse<{ data: UserListResponse }> = await this.api.get(`/users?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const response: AxiosResponse<{ data: User }> = await this.api.get(`/users/${userId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response: AxiosResponse<{ data: User }> = await this.api.post('/users', userData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create user');
    }
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    try {
      const response: AxiosResponse<{ data: User }> = await this.api.put(`/users/${userId}`, userData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user');
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.api.delete(`/users/${userId}`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  }

  async bulkUpdateUsers(operation: BulkUserOperation): Promise<boolean> {
    try {
      await this.api.post('/users/bulk', operation);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to perform bulk operation');
    }
  }

  async getUserHierarchy(rootUserId?: string): Promise<UserHierarchy[]> {
    try {
      const params = rootUserId ? `?rootUserId=${rootUserId}` : '';
      const response: AxiosResponse<{ data: UserHierarchy[] }> = await this.api.get(`/users/hierarchy${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user hierarchy');
    }
  }

  async importUsers(file: File): Promise<UserImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response: AxiosResponse<{ data: UserImportResult }> = await this.api.post('/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to import users');
    }
  }

  async exportUsers(filters?: UserSearchFilters): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await this.api.get(`/users/export?${params}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export users');
    }
  }

  async getDepartments(): Promise<Department[]> {
    try {
      const response: AxiosResponse<{ data: Department[] }> = await this.api.get('/departments');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch departments');
    }
  }

  async getRoles(): Promise<Role[]> {
    try {
      const response: AxiosResponse<{ data: Role[] }> = await this.api.get('/roles');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch roles');
    }
  }

  async resetUserPassword(userId: string, sendEmail: boolean = true): Promise<boolean> {
    try {
      await this.api.post(`/users/${userId}/reset-password`, { sendEmail });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset user password');
    }
  }

  async toggleUserStatus(userId: string, status: 'Active' | 'Inactive' | 'Suspended'): Promise<User> {
    try {
      const response: AxiosResponse<{ data: User }> = await this.api.patch(`/users/${userId}/status`, { status });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user status');
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    newUsersThisMonth: number;
    departmentBreakdown: Array<{ department: string; count: number }>;
    roleBreakdown: Array<{ role: string; count: number }>;
  }> {
    try {
      const response = await this.api.get('/users/stats');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user statistics');
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new UserManagementService();
