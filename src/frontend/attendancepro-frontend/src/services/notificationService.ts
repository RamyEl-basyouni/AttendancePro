import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder';
  data?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  source?: string;
}

export interface SendNotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  type?: string;
  data?: string;
  actionUrl?: string;
  priority?: string;
  category?: string;
  channels?: string[];
  scheduledAt?: string;
  expiresAt?: string;
}

export interface SendBulkNotificationRequest {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  data?: string;
  actionUrl?: string;
  priority?: string;
  category?: string;
  channels?: string[];
  scheduledAt?: string;
}

export interface NotificationPreferencesDto {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  notificationTypes: {
    attendance: boolean;
    leave: boolean;
    approval: boolean;
    system: boolean;
    security: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  language: string;
}

export interface NotificationStatsDto {
  totalSent: number;
  totalRead: number;
  totalUnread: number;
  readRate: number;
  averageReadTime: number;
  topCategories: {
    category: string;
    count: number;
  }[];
  deliveryStats: {
    email: number;
    push: number;
    sms: number;
    inApp: number;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  type: string;
  subject: string;
  body: string;
  variables?: string[];
}

export interface UpdateTemplateRequest {
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface DeviceRegistration {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  userId: string;
  isActive: boolean;
  registeredAt: string;
}

class NotificationService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/Notifications`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  private pushApi = axios.create({
    baseURL: `${API_BASE_URL}/PushNotifications`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  private templateApi = axios.create({
    baseURL: `${API_BASE_URL}/NotificationTemplates`,
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
    setupInterceptors(this.pushApi);
    setupInterceptors(this.templateApi);
  }

  async sendNotification(request: SendNotificationRequest): Promise<NotificationDto> {
    try {
      const response: AxiosResponse<NotificationDto> = await this.api.post('/send', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send notification');
    }
  }

  async sendBulkNotification(request: SendBulkNotificationRequest): Promise<boolean> {
    try {
      await this.api.post('/send-bulk', request);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send bulk notification');
    }
  }

  async getNotifications(page: number = 1, pageSize: number = 50): Promise<NotificationDto[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response: AxiosResponse<NotificationDto[]> = await this.api.get(`/?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  async getNotification(id: string): Promise<NotificationDto | null> {
    try {
      const response: AxiosResponse<NotificationDto> = await this.api.get(`/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch notification');
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    try {
      await this.api.put(`/${id}/read`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      await this.api.put('/read-all');
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response: AxiosResponse<number> = await this.api.get('/unread-count');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await this.api.delete(`/${id}`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete notification');
    }
  }

  async getNotificationStats(): Promise<NotificationStatsDto> {
    try {
      const response: AxiosResponse<NotificationStatsDto> = await this.api.get('/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notification statistics');
    }
  }

  async updateNotificationPreferences(preferences: NotificationPreferencesDto): Promise<boolean> {
    try {
      await this.api.put('/preferences', preferences);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update notification preferences');
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferencesDto> {
    try {
      const response: AxiosResponse<NotificationPreferencesDto> = await this.api.get('/preferences');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notification preferences');
    }
  }

  async registerDevice(deviceToken: string, platform: 'ios' | 'android' | 'web'): Promise<boolean> {
    try {
      await this.pushApi.post('/register-device', {
        deviceToken,
        platform,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to register device');
    }
  }

  async unregisterDevice(deviceToken: string): Promise<boolean> {
    try {
      await this.pushApi.post('/unregister-device', {
        deviceToken,
      });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to unregister device');
    }
  }

  async getTemplates(type?: string): Promise<NotificationTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);

      const response: AxiosResponse<NotificationTemplate[]> = await this.templateApi.get(`/?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notification templates');
    }
  }

  async getTemplate(name: string, type: string): Promise<NotificationTemplate | null> {
    try {
      const response: AxiosResponse<NotificationTemplate> = await this.templateApi.get(`/${name}/${type}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch notification template');
    }
  }

  async createTemplate(request: CreateTemplateRequest): Promise<NotificationTemplate> {
    try {
      const response: AxiosResponse<NotificationTemplate> = await this.templateApi.post('/', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create notification template');
    }
  }

  async updateTemplate(id: string, request: UpdateTemplateRequest): Promise<boolean> {
    try {
      await this.templateApi.put(`/${id}`, request);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update notification template');
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await this.templateApi.delete(`/${id}`);
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete notification template');
    }
  }

  async validateTemplate(template: string): Promise<boolean> {
    try {
      const response: AxiosResponse<boolean> = await this.templateApi.post('/validate', {
        template,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate notification template');
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

  subscribeToRealTimeNotifications(callback: (notification: NotificationDto) => void): (() => void) | undefined {
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        const eventSource = new EventSource(`${API_BASE_URL}/Notifications/stream`, {
          withCredentials: true,
        });

        eventSource.onmessage = (event) => {
          try {
            const notification: NotificationDto = JSON.parse(event.data);
            callback(notification);
          } catch (error) {
            console.error('Failed to parse notification:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Notification stream error:', error);
          eventSource.close();
        };

        return () => {
          eventSource.close();
        };
      }
      return undefined;
    } catch (error: any) {
      throw new Error('Failed to subscribe to real-time notifications');
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async showBrowserNotification(notification: NotificationDto): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
        });

        browserNotification.onclick = () => {
          if (notification.actionUrl) {
            window.open(notification.actionUrl, '_blank');
          }
          browserNotification.close();
        };

        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }
}

export default new NotificationService();
