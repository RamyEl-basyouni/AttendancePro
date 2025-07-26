import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface LeaveType {
  id: string;
  name: string;
  description: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  isActive: boolean;
  color: string;
}

export interface LeaveRequest {
  id?: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  attachments?: string[];
  isEmergency: boolean;
  emergencyContact?: string;
  emergencyReason?: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isEmergency?: boolean;
  emergencyContact?: string;
  emergencyReason?: string;
  attachments?: File[];
}

export interface PermissionRequest {
  id?: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  isEmergency: boolean;
}

export interface CreatePermissionRequest {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  isEmergency?: boolean;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  totalAllowed: number;
  used: number;
  remaining: number;
  pending: number;
  carryOver: number;
  expiryDate?: string;
}

export interface ApprovalRequest {
  requestId: string;
  action: 'approve' | 'reject';
  comments?: string;
  approverNotes?: string;
}

export interface LeaveCalendarEvent {
  id: string;
  userId: string;
  userName: string;
  title: string;
  start: string;
  end: string;
  type: 'leave' | 'permission';
  status: string;
  leaveType?: string;
  color: string;
}

export interface LeaveReport {
  userId: string;
  userName: string;
  period: string;
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  balances: LeaveBalance[];
  totalLeaveDays: number;
  totalPermissionHours: number;
  generatedAt: string;
}

export interface LeavePolicy {
  id: string;
  name: string;
  description: string;
  rules: {
    maxConsecutiveDays: number;
    minAdvanceNotice: number;
    maxRequestsPerMonth: number;
    blackoutPeriods: string[];
    requiresManagerApproval: boolean;
    requiresHRApproval: boolean;
  };
  applicableLeaveTypes: string[];
  isActive: boolean;
}

class LeaveManagementService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/LeaveManagement`,
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

  async createLeaveRequest(request: CreateLeaveRequest): Promise<LeaveRequest> {
    try {
      const formData = new FormData();
      formData.append('leaveTypeId', request.leaveTypeId);
      formData.append('startDate', request.startDate);
      formData.append('endDate', request.endDate);
      formData.append('reason', request.reason);
      
      if (request.isEmergency) {
        formData.append('isEmergency', 'true');
        if (request.emergencyContact) formData.append('emergencyContact', request.emergencyContact);
        if (request.emergencyReason) formData.append('emergencyReason', request.emergencyReason);
      }

      if (request.attachments) {
        request.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const response: AxiosResponse<{success: boolean; data: LeaveRequest; message: string}> = await this.api.post('/leave-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create leave request');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create leave request');
    }
  }

  async createPermissionRequest(request: CreatePermissionRequest): Promise<PermissionRequest> {
    try {
      const response: AxiosResponse<{success: boolean; data: PermissionRequest; message: string}> = await this.api.post('/permission-requests', request);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create permission request');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create permission request');
    }
  }

  async getLeaveRequests(
    status?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<LeaveRequest[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response: AxiosResponse<{success: boolean; data: LeaveRequest[]; message: string}> = await this.api.get(`/leave-requests?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch leave requests');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave requests');
    }
  }

  async getPermissionRequests(
    status?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PermissionRequest[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response: AxiosResponse<PermissionRequest[]> = await this.api.get(`/permission-requests?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch permission requests');
    }
  }

  async approveLeaveRequest(approval: ApprovalRequest): Promise<boolean> {
    try {
      await this.api.put(`/leave-requests/${approval.requestId}/approve`, {
        comments: approval.comments,
        approverNotes: approval.approverNotes,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve leave request');
    }
  }

  async rejectLeaveRequest(rejection: ApprovalRequest): Promise<boolean> {
    try {
      await this.api.put(`/leave-requests/${rejection.requestId}/reject`, {
        comments: rejection.comments,
        approverNotes: rejection.approverNotes,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject leave request');
    }
  }

  async approvePermissionRequest(approval: ApprovalRequest): Promise<boolean> {
    try {
      await this.api.put(`/permission-requests/${approval.requestId}/approve`, {
        comments: approval.comments,
        approverNotes: approval.approverNotes,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve permission request');
    }
  }

  async rejectPermissionRequest(rejection: ApprovalRequest): Promise<boolean> {
    try {
      await this.api.put(`/permission-requests/${rejection.requestId}/reject`, {
        comments: rejection.comments,
        approverNotes: rejection.approverNotes,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject permission request');
    }
  }

  async cancelLeaveRequest(requestId: string, reason?: string): Promise<boolean> {
    try {
      await this.api.put(`/leave-requests/${requestId}/cancel`, { reason });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel leave request');
    }
  }

  async cancelPermissionRequest(requestId: string, reason?: string): Promise<boolean> {
    try {
      await this.api.put(`/permission-requests/${requestId}/cancel`, { reason });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel permission request');
    }
  }

  async getLeaveBalance(userId?: string): Promise<LeaveBalance[]> {
    try {
      const url = userId ? `/balance/${userId}` : '/balance';
      const response: AxiosResponse<{success: boolean; data: LeaveBalance[]; message: string}> = await this.api.get(url);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch leave balance');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave balance');
    }
  }

  async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      const response: AxiosResponse<{success: boolean; data: LeaveType[]; message: string}> = await this.api.get('/leave-types');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch leave types');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave types');
    }
  }

  async getLeaveCalendar(startDate: string, endDate: string, userId?: string): Promise<LeaveCalendarEvent[]> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) params.append('userId', userId);

      const response: AxiosResponse<LeaveCalendarEvent[]> = await this.api.get(`/calendar?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave calendar');
    }
  }

  async generateLeaveReport(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<LeaveReport> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) params.append('userId', userId);

      const response: AxiosResponse<LeaveReport> = await this.api.get(`/report?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate leave report');
    }
  }

  async getPendingApprovals(page: number = 1, pageSize: number = 50): Promise<{
    leaveRequests: LeaveRequest[];
    permissionRequests: PermissionRequest[];
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await this.api.get(`/pending-approvals?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch pending approvals');
    }
  }

  async getLeavePolicies(): Promise<LeavePolicy[]> {
    try {
      const response: AxiosResponse<LeavePolicy[]> = await this.api.get('/policies');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave policies');
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

  async bulkApproveRequests(requestIds: string[], comments?: string): Promise<boolean> {
    try {
      await this.api.post('/bulk-approve', {
        requestIds,
        comments,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to bulk approve requests');
    }
  }

  async getLeaveRequestById(requestId: string): Promise<LeaveRequest> {
    try {
      const response: AxiosResponse<LeaveRequest> = await this.api.get(`/leave-requests/${requestId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch leave request');
    }
  }

  async getPermissionRequestById(requestId: string): Promise<PermissionRequest> {
    try {
      const response: AxiosResponse<PermissionRequest> = await this.api.get(`/permission-requests/${requestId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch permission request');
    }
  }
}

export default new LeaveManagementService();
