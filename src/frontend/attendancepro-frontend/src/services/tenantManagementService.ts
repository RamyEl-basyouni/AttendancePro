import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  currency: string;
  language: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Trial';
  subscriptionPlan: 'Basic' | 'Professional' | 'Enterprise' | 'Custom';
  maxUsers: number;
  currentUsers: number;
  features: string[];
  customBranding: TenantBranding;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  billingInfo?: BillingInfo;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss?: string;
  faviconUrl?: string;
  loginBackgroundUrl?: string;
  companyName: string;
  tagline?: string;
}

export interface TenantSettings {
  workingHours: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
  attendanceRules: {
    allowLateCheckIn: boolean;
    lateThresholdMinutes: number;
    allowEarlyCheckOut: boolean;
    earlyThresholdMinutes: number;
    requireBreakTime: boolean;
    minimumBreakMinutes: number;
  };
  leaveSettings: {
    autoApproveLeave: boolean;
    maxConsecutiveDays: number;
    advanceNoticeDays: number;
    allowNegativeBalance: boolean;
  };
  securitySettings: {
    enforcePasswordPolicy: boolean;
    requireTwoFactor: boolean;
    sessionTimeoutMinutes: number;
    allowMultipleSessions: boolean;
    ipWhitelist: string[];
  };
  notificationSettings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    slackIntegration: boolean;
    teamsIntegration: boolean;
  };
  integrationSettings: {
    enabledIntegrations: string[];
    apiKeys: Record<string, string>;
    webhookUrls: Record<string, string>;
  };
}

export interface BillingInfo {
  billingEmail: string;
  billingAddress: string;
  paymentMethod: 'CreditCard' | 'BankTransfer' | 'Invoice';
  nextBillingDate: string;
  lastPaymentDate?: string;
  monthlyAmount: number;
  currency: string;
  invoiceHistory: Invoice[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  downloadUrl?: string;
}

export interface CreateTenantRequest {
  name: string;
  domain: string;
  subdomain: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  currency: string;
  language: string;
  subscriptionPlan: 'Basic' | 'Professional' | 'Enterprise' | 'Custom';
  maxUsers: number;
  features: string[];
  customBranding?: Partial<TenantBranding>;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Trial';
  subscriptionPlan?: 'Basic' | 'Professional' | 'Enterprise' | 'Custom';
  maxUsers?: number;
  features?: string[];
  customBranding?: Partial<TenantBranding>;
  settings?: Partial<TenantSettings>;
}

export interface TenantSearchFilters {
  search?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Trial';
  subscriptionPlan?: 'Basic' | 'Professional' | 'Enterprise' | 'Custom';
  country?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'currentUsers' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TenantListResponse {
  tenants: Tenant[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TenantAnalytics {
  tenantId: string;
  period: string;
  totalUsers: number;
  activeUsers: number;
  totalAttendanceRecords: number;
  averageWorkingHours: number;
  leaveRequests: number;
  approvedLeaves: number;
  pendingLeaves: number;
  systemUsage: {
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  featureUsage: Record<string, number>;
  performanceMetrics: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
  };
}

export interface TenantUsageReport {
  tenantId: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    deletedUsers: number;
  };
  attendanceMetrics: {
    totalRecords: number;
    onTimeRecords: number;
    lateRecords: number;
    absentDays: number;
  };
  systemMetrics: {
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
    peakConcurrentUsers: number;
  };
  billingMetrics: {
    currentPlan: string;
    monthlyAmount: number;
    usageOverages: number;
    nextBillingDate: string;
  };
}

class TenantManagementService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/TenantManagement`,
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

  async getTenants(filters?: TenantSearchFilters): Promise<TenantListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      const response: AxiosResponse<{ data: TenantListResponse }> = await this.api.get(`/tenants?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tenants');
    }
  }

  async getTenantById(tenantId: string): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.get(`/tenants/${tenantId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tenant');
    }
  }

  async createTenant(tenantData: CreateTenantRequest): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.post('/tenants', tenantData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create tenant');
    }
  }

  async updateTenant(tenantId: string, tenantData: UpdateTenantRequest): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.put(`/tenants/${tenantId}`, tenantData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update tenant');
    }
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      await this.api.delete(`/tenants/${tenantId}`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete tenant');
    }
  }

  async updateTenantStatus(tenantId: string, status: 'Active' | 'Inactive' | 'Suspended' | 'Trial'): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.patch(`/tenants/${tenantId}/status`, { status });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update tenant status');
    }
  }

  async updateTenantBranding(tenantId: string, branding: Partial<TenantBranding>): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.put(`/tenants/${tenantId}/branding`, branding);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update tenant branding');
    }
  }

  async updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<Tenant> {
    try {
      const response: AxiosResponse<{ data: Tenant }> = await this.api.put(`/tenants/${tenantId}/settings`, settings);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update tenant settings');
    }
  }

  async getTenantAnalytics(tenantId: string, period: string = '30d'): Promise<TenantAnalytics> {
    try {
      const response: AxiosResponse<{ data: TenantAnalytics }> = await this.api.get(`/tenants/${tenantId}/analytics?period=${period}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tenant analytics');
    }
  }

  async getTenantUsageReport(tenantId: string, startDate: string, endDate: string): Promise<TenantUsageReport> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response: AxiosResponse<{ data: TenantUsageReport }> = await this.api.get(`/tenants/${tenantId}/usage?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tenant usage report');
    }
  }

  async exportTenants(filters?: TenantSearchFilters): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await this.api.get(`/tenants/export?${params}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export tenants');
    }
  }

  async uploadTenantLogo(tenantId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response: AxiosResponse<{ data: { logoUrl: string } }> = await this.api.post(`/tenants/${tenantId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data.logoUrl;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload tenant logo');
    }
  }

  async getAvailableFeatures(): Promise<Array<{ id: string; name: string; description: string; category: string }>> {
    try {
      const response = await this.api.get('/features');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch available features');
    }
  }

  async getSubscriptionPlans(): Promise<Array<{ id: string; name: string; description: string; price: number; features: string[] }>> {
    try {
      const response = await this.api.get('/subscription-plans');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription plans');
    }
  }

  async getTenantStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    newTenantsThisMonth: number;
    totalUsers: number;
    totalRevenue: number;
    planBreakdown: Array<{ plan: string; count: number }>;
    countryBreakdown: Array<{ country: string; count: number }>;
  }> {
    try {
      const response = await this.api.get('/tenants/stats');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tenant statistics');
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

export default new TenantManagementService();
