import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api'
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD

interface LoginResponse {
  access_token: string
  token_type: string
  user: User
  requiresTwoFactor?: boolean
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  employeeId?: string
  department?: string
  position?: string
  profilePictureUrl?: string
  status: string
  roles: string[]
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phoneNumber?: string
  employeeId?: string
  department?: string
  position?: string
}

class AuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  })

  constructor() {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken')
          window.location.href = '/login'
        }
        
        return Promise.reject(error)
      }
    )
  }

  async login(email: string, password: string, twoFactorCode?: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<{success: boolean; data: {accessToken: string; refreshToken: string; user: any; requiresTwoFactor?: boolean}}> = await this.api.post('/auth/login', {
        email,
        password,
        twoFactorCode,
      })
      
      if (response.data.success && response.data.data.accessToken) {
        localStorage.setItem('accessToken', response.data.data.accessToken)
        localStorage.setItem('refreshToken', response.data.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        
        return {
          access_token: response.data.data.accessToken,
          token_type: 'Bearer',
          user: response.data.data.user,
          requiresTwoFactor: response.data.data.requiresTwoFactor
        }
      } else {
        throw new Error('Login failed')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  async register(userData: RegisterData): Promise<void> {
    try {
      const response: AxiosResponse<{success: boolean; data: any; message: string}> = await this.api.post('/api/auth/register', userData)
      if (response.data.success) {
        return
      } else {
        throw new Error(response.data.message || 'Registration failed')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.api.post('/api/auth/logout', { userId })
    } catch (error: any) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<{success: boolean; data: LoginResponse; message: string}> = await this.api.post('/api/auth/refresh', {
        refreshToken,
      })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Token refresh failed')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Token refresh failed')
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response: AxiosResponse<{success: boolean; data: User; message: string}> = await this.api.get('/api/auth/me')
      if (response.data.success && response.data.data) {
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to get current user')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get current user')
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await this.api.post('/api/auth/forgot-password', { email })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send reset email')
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.api.post('/api/auth/reset-password', { token, newPassword })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset failed')
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.api.post('/api/auth/change-password', {
        userId,
        currentPassword,
        newPassword,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password change failed')
    }
  }

  async validateTwoFactor(userId: string, code: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/validate-2fa', {
        userId,
        code,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '2FA validation failed')
    }
  }

  async setupTwoFactor(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    try {
      const response = await this.api.post('/auth/setup-2fa', { userId })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '2FA setup failed')
    }
  }

  async enableTwoFactor(userId: string, code: string): Promise<void> {
    try {
      await this.api.post('/auth/enable-2fa', { userId, code })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to enable 2FA')
    }
  }

  async disableTwoFactor(userId: string, password: string): Promise<void> {
    try {
      await this.api.post('/auth/disable-2fa', { userId, password })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to disable 2FA')
    }
  }

  async loginWithBiometric(biometricData: string, userId?: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/biometric-login', {
        biometricData,
        userId,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Biometric login failed')
    }
  }

  async enrollBiometric(userId: string, biometricData: string, biometricType: 'face' | 'fingerprint'): Promise<void> {
    try {
      await this.api.post('/auth/enroll-biometric', {
        userId,
        biometricData,
        biometricType,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Biometric enrollment failed')
    }
  }

  async verifyBiometric(userId: string, biometricData: string, biometricType: 'face' | 'fingerprint'): Promise<boolean> {
    try {
      const response = await this.api.post('/auth/verify-biometric', {
        userId,
        biometricData,
        biometricType,
      })
      return response.data.isValid
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Biometric verification failed')
    }
  }

  async registerDevice(deviceToken: string, platform: 'ios' | 'android' | 'web', userId: string): Promise<void> {
    try {
      await this.api.post('/auth/register-device', {
        deviceToken,
        platform,
        userId,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Device registration failed')
    }
  }

  async unregisterDevice(deviceToken: string, userId: string): Promise<void> {
    try {
      await this.api.post('/auth/unregister-device', {
        deviceToken,
        userId,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Device unregistration failed')
    }
  }

  async getDevices(userId: string): Promise<Array<{
    id: string;
    deviceToken: string;
    platform: string;
    isActive: boolean;
    registeredAt: string;
    lastUsed?: string;
  }>> {
    try {
      const response = await this.api.get(`/auth/devices/${userId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch devices')
    }
  }

  async revokeDevice(deviceId: string, userId: string): Promise<void> {
    try {
      await this.api.delete(`/auth/devices/${deviceId}`, {
        data: { userId }
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to revoke device')
    }
  }

  async getSecuritySettings(userId: string): Promise<{
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    lastPasswordChange: string;
    activeDevices: number;
    recentLogins: Array<{
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      location?: string;
    }>;
  }> {
    try {
      const response = await this.api.get(`/auth/security-settings/${userId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch security settings')
    }
  }

  async updateSecuritySettings(userId: string, settings: {
    requireTwoFactor?: boolean;
    requireBiometric?: boolean;
    sessionTimeout?: number;
    allowMultipleDevices?: boolean;
  }): Promise<void> {
    try {
      await this.api.put(`/auth/security-settings/${userId}`, settings)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update security settings')
    }
  }
}

export const authService = new AuthService()
export type { AuthService, User, RegisterData, LoginResponse }
