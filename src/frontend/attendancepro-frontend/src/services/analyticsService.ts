import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface AnalyticsOverview {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
  averageWorkingHours: number;
  pendingLeaveRequests: number;
  upcomingLeaves: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  attendanceRate: number;
}

export interface ProductivityMetric {
  userId: string;
  userName: string;
  department: string;
  averageHours: number;
  attendanceRate: number;
  punctualityScore: number;
  productivityScore: number;
  lastUpdated: string;
}

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  presentToday: number;
  attendanceRate: number;
  averageWorkingHours: number;
  topPerformers: ProductivityMetric[];
  trends: AttendanceTrend[];
}

export interface PredictiveInsight {
  type: 'attendance_risk' | 'turnover_risk' | 'capacity_forecast' | 'anomaly_detection';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  affectedUsers?: string[];
  predictedDate?: string;
  metadata?: Record<string, any>;
}

export interface AbsenteeismRisk {
  userId: string;
  userName: string;
  department: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  lastUpdated: string;
}

export interface TurnoverRisk {
  userId: string;
  userName: string;
  department: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  predictedDate?: string;
  lastUpdated: string;
}

export interface WorkforceCapacity {
  date: string;
  predictedCapacity: number;
  actualCapacity?: number;
  variance?: number;
  confidence: number;
  factors: string[];
}

export interface AnomalyDetection {
  id: string;
  type: 'attendance_pattern' | 'working_hours' | 'location_anomaly' | 'behavior_change';
  userId?: string;
  userName?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  userId?: string;
  includeInactive?: boolean;
}

export interface RecentActivity {
  id: string;
  employeeName: string;
  action: 'check-in' | 'check-out' | 'late' | 'absent';
  time: string;
  location?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

class AnalyticsService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/Analytics`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  private predictiveApi = axios.create({
    baseURL: `${API_BASE_URL}/PredictiveAnalytics`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  constructor() {
    const setupInterceptors = (apiInstance: any) => {
      apiInstance.interceptors.request.use((config: any) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      apiInstance.interceptors.response.use(
        (response: any) => response,
        (error: any) => {
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      );
    };

    setupInterceptors(this.api);
    setupInterceptors(this.predictiveApi);
  }

  async getOverview(filter?: AnalyticsFilter): Promise<AnalyticsOverview> {
    try {
      const params = new URLSearchParams();
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.departmentId) params.append('departmentId', filter.departmentId);

      const response: AxiosResponse<{success: boolean; data: AnalyticsOverview; message: string}> = await this.api.get(`/overview?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch analytics overview');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch analytics overview');
    }
  }

  async getAttendanceTrends(filter?: AnalyticsFilter): Promise<AttendanceTrend[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.departmentId) params.append('departmentId', filter.departmentId);

      const response: AxiosResponse<{success: boolean; data: AttendanceTrend[]; message: string}> = await this.api.get(`/attendance-trends?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch attendance trends');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance trends');
    }
  }

  async getProductivityMetrics(filter?: AnalyticsFilter): Promise<ProductivityMetric[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.departmentId) params.append('departmentId', filter.departmentId);
      if (filter?.userId) params.append('userId', filter.userId);

      const response: AxiosResponse<{success: boolean; data: ProductivityMetric[]; message: string}> = await this.api.get(`/productivity?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch productivity metrics');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch productivity metrics');
    }
  }

  async getDepartmentAnalytics(departmentId?: string, filter?: AnalyticsFilter): Promise<DepartmentAnalytics[]> {
    try {
      const params = new URLSearchParams();
      if (departmentId) params.append('departmentId', departmentId);
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);

      const response: AxiosResponse<{success: boolean; data: DepartmentAnalytics[]; message: string}> = await this.api.get(`/departments?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch department analytics');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch department analytics');
    }
  }

  async predictAttendance(date: string, userId?: string): Promise<{
    predictedAttendance: boolean;
    confidence: number;
    factors: string[];
  }> {
    try {
      const params = new URLSearchParams({ date });
      if (userId) params.append('userId', userId);

      const response = await this.predictiveApi.get(`/predict-attendance?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to predict attendance');
    }
  }

  async getAbsenteeismRisk(userId?: string): Promise<AbsenteeismRisk[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response: AxiosResponse<AbsenteeismRisk[]> = await this.predictiveApi.get(`/absenteeism-risk?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch absenteeism risk');
    }
  }

  async getTurnoverRisk(userId?: string): Promise<TurnoverRisk[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response: AxiosResponse<TurnoverRisk[]> = await this.predictiveApi.get(`/turnover-risk?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch turnover risk');
    }
  }

  async getWorkforceCapacity(startDate: string, endDate: string): Promise<WorkforceCapacity[]> {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response: AxiosResponse<WorkforceCapacity[]> = await this.predictiveApi.get(`/workforce-capacity?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch workforce capacity forecast');
    }
  }

  async getAnomalies(resolved?: boolean, severity?: string): Promise<AnomalyDetection[]> {
    try {
      const params = new URLSearchParams();
      if (resolved !== undefined) params.append('resolved', resolved.toString());
      if (severity) params.append('severity', severity);

      const response: AxiosResponse<AnomalyDetection[]> = await this.predictiveApi.get(`/anomalies?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch anomalies');
    }
  }

  async getPredictiveInsights(type?: string, limit?: number): Promise<PredictiveInsight[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());

      const response: AxiosResponse<PredictiveInsight[]> = await this.predictiveApi.get(`/insights?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch predictive insights');
    }
  }

  async resolveAnomaly(anomalyId: string, resolution: string): Promise<boolean> {
    try {
      await this.predictiveApi.put(`/anomalies/${anomalyId}/resolve`, { resolution });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resolve anomaly');
    }
  }

  async getAttendanceChart(filter?: AnalyticsFilter): Promise<ChartData> {
    try {
      const trends = await this.getAttendanceTrends(filter);
      return {
        labels: trends.map(t => t.date),
        datasets: [
          {
            label: 'Present',
            data: trends.map(t => t.present),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
          },
          {
            label: 'Absent',
            data: trends.map(t => t.absent),
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
          },
          {
            label: 'Late',
            data: trends.map(t => t.late),
            backgroundColor: 'rgba(251, 191, 36, 0.8)',
            borderColor: 'rgba(251, 191, 36, 1)',
            borderWidth: 2,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate attendance chart data');
    }
  }

  async getProductivityChart(filter?: AnalyticsFilter): Promise<ChartData> {
    try {
      const metrics = await this.getProductivityMetrics(filter);
      return {
        labels: metrics.map(m => m.userName),
        datasets: [
          {
            label: 'Productivity Score',
            data: metrics.map(m => m.productivityScore),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
          },
          {
            label: 'Attendance Rate',
            data: metrics.map(m => m.attendanceRate * 100),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate productivity chart data');
    }
  }

  async getDepartmentChart(filter?: AnalyticsFilter): Promise<ChartData> {
    try {
      const departments = await this.getDepartmentAnalytics(undefined, filter);
      return {
        labels: departments.map(d => d.departmentName),
        datasets: [
          {
            label: 'Attendance Rate',
            data: departments.map(d => d.attendanceRate * 100),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(147, 51, 234, 0.8)',
              'rgba(236, 72, 153, 0.8)',
            ],
            borderWidth: 2,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to generate department chart data');
    }
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const response: AxiosResponse<{success: boolean; data: RecentActivity[]; message: string}> = await this.api.get(`/recent-activity?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch recent activity');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch recent activity');
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

  async exportReport(
    type: 'attendance' | 'productivity' | 'department' | 'predictive',
    format: 'pdf' | 'excel' | 'csv',
    filter?: AnalyticsFilter
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        type,
        format,
      });

      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.departmentId) params.append('departmentId', filter.departmentId);
      if (filter?.userId) params.append('userId', filter.userId);

      const response = await this.api.get(`/export?${params}`, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export report');
    }
  }
}

export default new AnalyticsService();
