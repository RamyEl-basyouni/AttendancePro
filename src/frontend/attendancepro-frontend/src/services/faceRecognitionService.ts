import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface FaceEnrollmentRequest {
  imageData: string;
  userId?: string;
}

export interface FaceVerificationRequest {
  imageData: string;
  userId?: string;
}

export interface LivenessDetectionRequest {
  imageData: string;
}

export interface FaceTemplate {
  id: string;
  userId: string;
  templateData: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaceEnrollmentResponse {
  success: boolean;
  templateId?: string;
  message: string;
  confidence?: number;
}

export interface FaceVerificationResponse {
  success: boolean;
  isMatch: boolean;
  confidence: number;
  message: string;
  userId?: string;
}

export interface LivenessDetectionResponse {
  isLive: boolean;
  confidence: number;
  message: string;
}

export interface BiometricAuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  deviceInfo: string;
  success: boolean;
}

class FaceRecognitionService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/FaceRecognition`,
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

  async enrollFace(request: FaceEnrollmentRequest): Promise<FaceEnrollmentResponse> {
    try {
      const response: AxiosResponse<FaceEnrollmentResponse> = await this.api.post('/enroll', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Face enrollment failed');
    }
  }

  async verifyFace(request: FaceVerificationRequest): Promise<FaceVerificationResponse> {
    try {
      const response: AxiosResponse<FaceVerificationResponse> = await this.api.post('/verify', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Face verification failed');
    }
  }

  async detectLiveness(request: LivenessDetectionRequest): Promise<LivenessDetectionResponse> {
    try {
      const response: AxiosResponse<LivenessDetectionResponse> = await this.api.post('/liveness', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Liveness detection failed');
    }
  }

  async getUserTemplates(userId?: string): Promise<FaceTemplate[]> {
    try {
      const url = userId ? `/templates/${userId}` : '/templates';
      const response: AxiosResponse<FaceTemplate[]> = await this.api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch face templates');
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      await this.api.delete(`/templates/${templateId}`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete face template');
    }
  }

  async activateTemplate(templateId: string): Promise<boolean> {
    try {
      await this.api.put(`/templates/${templateId}/activate`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to activate face template');
    }
  }

  async deactivateTemplate(templateId: string): Promise<boolean> {
    try {
      await this.api.put(`/templates/${templateId}/deactivate`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate face template');
    }
  }

  async getBiometricAuditLogs(userId?: string, page: number = 1, pageSize: number = 50): Promise<BiometricAuditLog[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (userId) {
        params.append('userId', userId);
      }

      const response: AxiosResponse<BiometricAuditLog[]> = await this.api.get(`/audit-logs?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch biometric audit logs');
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

  async enrollWithLiveness(imageData: string, userId?: string): Promise<FaceEnrollmentResponse> {
    try {
      const livenessResult = await this.detectLiveness({ imageData });
      
      if (!livenessResult.isLive) {
        throw new Error('Liveness detection failed. Please ensure you are a real person.');
      }

      return await this.enrollFace({ imageData, userId });
    } catch (error: any) {
      throw new Error(error.message || 'Face enrollment with liveness check failed');
    }
  }

  async verifyWithLiveness(imageData: string, userId?: string): Promise<FaceVerificationResponse> {
    try {
      const livenessResult = await this.detectLiveness({ imageData });
      
      if (!livenessResult.isLive) {
        throw new Error('Liveness detection failed. Please ensure you are a real person.');
      }

      return await this.verifyFace({ imageData, userId });
    } catch (error: any) {
      throw new Error(error.message || 'Face verification with liveness check failed');
    }
  }
}

export default new FaceRecognitionService();
