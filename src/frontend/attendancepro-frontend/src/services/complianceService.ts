import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface ComplianceReport {
  id: string;
  tenantId: string;
  region: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalEmployees: number;
  totalWorkingDays: number;
  complianceScore: number;
  violations: ComplianceViolation[];
  regionalRequirements: RegionalRequirement[];
  recommendations: string[];
  language: string;
}

export interface ComplianceViolation {
  id: string;
  violationType: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  userId: string;
  userName?: string;
  detectedAt: string;
  resolvedAt?: string;
  isResolved: boolean;
  resolutionNotes?: string;
  affectedRegulations: string[];
}

export interface RegionalRequirement {
  id: string;
  category: string;
  requirement: string;
  description: string;
  mandatory: boolean;
  region: string;
  effectiveDate: string;
  expiryDate?: string;
  complianceLevel: 'Full' | 'Partial' | 'Non-Compliant';
}

export interface ComplianceStatus {
  tenantId: string;
  region: string;
  complianceScore: number;
  lastChecked: string;
  nextReviewDate: string;
  overallStatus: 'Compliant' | 'Partially Compliant' | 'Non-Compliant';
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  trendsData: ComplianceTrend[];
}

export interface ComplianceTrend {
  date: string;
  complianceScore: number;
  violationCount: number;
  criticalViolations: number;
}

export interface RegionalSettings {
  tenantId: string;
  region: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
  overtimeRules: {
    dailyThreshold: number;
    weeklyThreshold: number;
    monthlyThreshold: number;
  };
  breakRequirements: {
    minimumBreakDuration: number;
    maximumContinuousWork: number;
    mandatoryBreaks: boolean;
  };
  dataRetention: {
    attendanceRecords: number;
    auditLogs: number;
    biometricData: number;
  };
  privacySettings: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    dataProcessingConsent: boolean;
    rightToErasure: boolean;
  };
}

export interface LocalizedString {
  key: string;
  value: string;
  language: string;
  module: string;
}

export interface ComplianceDashboard {
  status: ComplianceStatus;
  recentViolations: ComplianceViolation[];
  requirements: RegionalRequirement[];
  summary: ComplianceSummary;
}

export interface ComplianceSummary {
  totalViolations: number;
  criticalViolations: number;
  complianceScore: number;
  lastReviewDate: string;
  nextReviewDate: string;
}

export interface GenerateReportRequest {
  tenantId: string;
  region: string;
  startDate: string;
  endDate: string;
  language?: string;
}

export interface ExportReportRequest {
  region: string;
  startDate: string;
  endDate: string;
  format: 'pdf' | 'excel' | 'csv';
  language?: string;
}

export interface ValidateComplianceRequest {
  region: string;
}

class ComplianceService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/Compliance`,
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

  async generateComplianceReport(request: GenerateReportRequest): Promise<ComplianceReport> {
    try {
      const response: AxiosResponse<{ data: ComplianceReport }> = await this.api.post('/reports/generate', request);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate compliance report');
    }
  }

  async getRegionalRequirements(countryCode: string): Promise<RegionalRequirement[]> {
    try {
      const response: AxiosResponse<{ data: RegionalRequirement[] }> = await this.api.get(`/requirements/${countryCode}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch regional requirements');
    }
  }

  async validateAttendanceCompliance(tenantId: string, request: ValidateComplianceRequest): Promise<boolean> {
    try {
      const response: AxiosResponse<{ data: boolean }> = await this.api.post(`/validate/${tenantId}`, request);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate compliance');
    }
  }

  async getComplianceStatus(tenantId: string, region: string): Promise<ComplianceStatus> {
    try {
      const params = new URLSearchParams({ region });
      const response: AxiosResponse<{ data: ComplianceStatus }> = await this.api.get(`/status/${tenantId}?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch compliance status');
    }
  }

  async getComplianceViolations(
    tenantId: string,
    region: string,
    startDate: string,
    endDate: string
  ): Promise<ComplianceViolation[]> {
    try {
      const params = new URLSearchParams({
        region,
        startDate,
        endDate,
      });
      const response: AxiosResponse<{ data: ComplianceViolation[] }> = await this.api.get(`/violations/${tenantId}?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch compliance violations');
    }
  }

  async updateRegionalSettings(tenantId: string, settings: RegionalSettings): Promise<boolean> {
    try {
      const response: AxiosResponse<{ data: boolean }> = await this.api.put(`/settings/${tenantId}`, settings);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update regional settings');
    }
  }

  async getLocalizedStrings(language: string, module: string): Promise<LocalizedString[]> {
    try {
      const response: AxiosResponse<{ data: LocalizedString[] }> = await this.api.get(`/localization/${language}/${module}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch localized strings');
    }
  }

  async getComplianceDashboard(tenantId: string, region: string): Promise<ComplianceDashboard> {
    try {
      const params = new URLSearchParams({ region });
      const response: AxiosResponse<{ data: ComplianceDashboard }> = await this.api.get(`/dashboard/${tenantId}?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch compliance dashboard');
    }
  }

  async exportComplianceReport(tenantId: string, request: ExportReportRequest): Promise<Blob> {
    try {
      const response = await this.api.post(`/export/${tenantId}`, request, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export compliance report');
    }
  }

  async resolveViolation(violationId: string, resolutionNotes: string): Promise<boolean> {
    try {
      await this.api.put(`/violations/${violationId}/resolve`, { resolutionNotes });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resolve violation');
    }
  }

  async getComplianceTrends(tenantId: string, region: string, days: number = 30): Promise<ComplianceTrend[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);


      const violations = await this.getComplianceViolations(
        tenantId,
        region,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const trendsMap = new Map<string, ComplianceTrend>();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        trendsMap.set(dateStr, {
          date: dateStr,
          complianceScore: 100,
          violationCount: 0,
          criticalViolations: 0,
        });
      }

      violations.forEach(violation => {
        const dateStr = violation.detectedAt.split('T')[0];
        const trend = trendsMap.get(dateStr);
        if (trend) {
          trend.violationCount++;
          if (violation.severity === 'Critical') {
            trend.criticalViolations++;
          }
          trend.complianceScore = Math.max(0, 100 - (trend.violationCount * 5));
        }
      });

      return Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate compliance trends');
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

export default new ComplianceService();
