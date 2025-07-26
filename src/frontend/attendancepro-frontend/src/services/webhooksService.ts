import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  secret: string;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
  };
  headers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
}

export interface CreateWebhookSubscriptionRequest {
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface UpdateWebhookSubscriptionRequest {
  name?: string;
  url?: string;
  eventTypes?: string[];
  isActive?: boolean;
  secret?: string;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: any;
  url: string;
  httpStatusCode?: number;
  responseBody?: string;
  deliveredAt?: string;
  failedAt?: string;
  retryCount: number;
  nextRetryAt?: string;
  isSuccessful: boolean;
  errorMessage?: string;
}

export interface WebhookStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  deliveriesLast24Hours: number;
  successRateLast24Hours: number;
}

export interface WebhookEventType {
  name: string;
  description: string;
}

export interface TriggerWebhookRequest {
  eventType: string;
  payload: any;
}

class WebhooksService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/Webhooks`,
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

  async createSubscription(request: CreateWebhookSubscriptionRequest): Promise<WebhookSubscription> {
    try {
      const response: AxiosResponse<WebhookSubscription> = await this.api.post('/subscriptions', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create webhook subscription');
    }
  }

  async getSubscriptions(): Promise<WebhookSubscription[]> {
    try {
      const response: AxiosResponse<WebhookSubscription[]> = await this.api.get('/subscriptions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch webhook subscriptions');
    }
  }

  async getSubscription(id: string): Promise<WebhookSubscription> {
    try {
      const response: AxiosResponse<WebhookSubscription> = await this.api.get(`/subscriptions/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch webhook subscription');
    }
  }

  async updateSubscription(id: string, request: UpdateWebhookSubscriptionRequest): Promise<void> {
    try {
      await this.api.put(`/subscriptions/${id}`, request);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update webhook subscription');
    }
  }

  async deleteSubscription(id: string): Promise<void> {
    try {
      await this.api.delete(`/subscriptions/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete webhook subscription');
    }
  }

  async triggerWebhook(request: TriggerWebhookRequest): Promise<void> {
    try {
      await this.api.post('/trigger', request);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to trigger webhook');
    }
  }

  async getDeliveryHistory(subscriptionId: string, page: number = 1, pageSize: number = 50): Promise<WebhookDelivery[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const response: AxiosResponse<WebhookDelivery[]> = await this.api.get(`/subscriptions/${subscriptionId}/deliveries?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch delivery history');
    }
  }

  async retryDelivery(deliveryId: string): Promise<void> {
    try {
      await this.api.post(`/deliveries/${deliveryId}/retry`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to retry delivery');
    }
  }

  async getWebhookStats(): Promise<WebhookStats> {
    try {
      const response: AxiosResponse<WebhookStats> = await this.api.get('/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch webhook statistics');
    }
  }

  async getEventTypes(): Promise<WebhookEventType[]> {
    try {
      const response: AxiosResponse<WebhookEventType[]> = await this.api.get('/event-types');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch event types');
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

export default new WebhooksService();
